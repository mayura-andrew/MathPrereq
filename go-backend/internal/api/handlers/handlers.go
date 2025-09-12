package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/mathprereq/internal/api/models"
	"github.com/mathprereq/internal/container"
	"github.com/mathprereq/internal/data/scraper"
	"github.com/mathprereq/internal/domain/services"
	"go.uber.org/zap"
)

type Handler struct {
	container container.Container
	validator *validator.Validate
	logger    *zap.Logger
	startTime time.Time
}

func NewHandler(container container.Container, logger *zap.Logger) *Handler {
	validator := validator.New()

	return &Handler{
		container: container,
		validator: validator,
		logger:    logger,
		startTime: time.Now(),
	}
}

func (h *Handler) ProcessQuery(c *gin.Context) {
	requestID := getRequestID(c)
	start := time.Now()

	var req models.QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid request", zap.Error(err), zap.String("request_id", requestID))
		c.JSON(http.StatusBadRequest, gin.H{
			"error":      err.Error(),
			"success":    false,
			"request_id": requestID,
		})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		h.logger.Warn("Validation failed", zap.Error(err), zap.String("request_id", requestID))
		c.JSON(http.StatusBadRequest, gin.H{
			"error":      "Validation failed: " + err.Error(),
			"success":    false,
			"request_id": requestID,
		})
		return
	}

	h.logger.Info("Processing query",
		zap.String("query", req.Question[:min(len(req.Question), 100)]),
		zap.String("request_id", requestID))

	// Use container's QueryService instead of undefined orchestrator
	result, err := h.container.QueryService().ProcessQuery(c.Request.Context(), &services.QueryRequest{
		UserID:    req.UserID,
		Question:  req.Question,
		RequestID: requestID,
	})
	processingTime := time.Since(start)

	if err != nil {
		h.logger.Error("Query processing failed", zap.Error(err))
		errorMsg := err.Error()
		response := models.QueryResponse{
			Success:            false,
			Query:              req.Question,
			IdentifiedConcepts: []string{},
			LearningPath:       models.LearningPath{Concepts: []models.ConceptInfo{}, TotalConcepts: 0, PathType: "prerequisite_path"},
			Explanation:        "I apologize, but I encountered an error while processing your question. Please try again or rephrase your question.",
			RetrievedContext:   []string{},
			ProcessingTime:     processingTime,
			ErrorMessage:       &errorMsg,
		}

		h.logger.Info("Returning error response", zap.Any("response", response))
		c.JSON(http.StatusOK, response) // Keep 200 status for frontend compatibility
		return
	}

	// Convert result to response format
	concepts := make([]models.ConceptInfo, len(result.PrerequisitePath))
	for i, concept := range result.PrerequisitePath {
		concepts[i] = models.ConceptInfo{
			ID:          concept.ID,
			Name:        concept.Name,
			Description: concept.Description,
			Type:        concept.Type,
		}
	}

	response := models.QueryResponse{
		Success:            true,
		Query:              req.Question,
		IdentifiedConcepts: result.IdentifiedConcepts,
		LearningPath: models.LearningPath{
			Concepts:      concepts,
			TotalConcepts: len(concepts),
			PathType:      "prerequisite_path",
		},
		Explanation:      result.Explanation,
		RetrievedContext: result.RetrievedContext,
		ProcessingTime:   processingTime,
	}

	h.logger.Info("Query processed successfully",
		zap.Duration("processing_time", processingTime),
		zap.Int("concepts", len(result.IdentifiedConcepts)),
		zap.Int("path_length", len(result.PrerequisitePath)),
		zap.Int("context_chunks", len(result.RetrievedContext)),
		zap.Int("explanation_length", len(result.Explanation)),
		zap.Bool("explanation_complete", len(result.Explanation) > 500 && (result.Explanation[len(result.Explanation)-1] == '.' || result.Explanation[len(result.Explanation)-1] == '!')))

	// Add response headers for better frontend handling
	c.Header("Content-Type", "application/json")
	c.Header("X-Processing-Time", processingTime.String())
	c.Header("X-Explanation-Length", fmt.Sprintf("%d", len(result.Explanation)))

	// Add warning header if explanation might be incomplete
	if len(result.Explanation) < 500 {
		c.Header("X-Response-Warning", "explanation-may-be-incomplete")
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) GetConceptDetail(c *gin.Context) {
	requestID := getRequestID(c)

	// Get concept ID from URL parameter instead of JSON body
	conceptID := c.Param("id")
	if conceptID == "" {
		h.logger.Warn("Missing concept ID parameter", zap.String("request_id", requestID))
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success:   false,
			Error:     "Concept ID parameter is required",
			RequestID: requestID,
			Timestamp: time.Now(),
		})
		return
	}

	h.logger.Info("Getting concept detail", zap.String("concept_id", conceptID), zap.String("request_id", requestID))

	result, err := h.container.QueryService().GetConceptDetail(c.Request.Context(), conceptID)
	if err != nil {
		h.logger.Error("Failed to get concept detail", zap.Error(err))
		errorMsg := err.Error()
		response := models.ConceptDetailResponse{
			Success:             false,
			Prerequisites:       []models.ConceptInfo{},
			LeadsTo:             []models.ConceptInfo{},
			DetailedExplanation: "",
			RequestID:           requestID,
			ErrorMessage:        &errorMsg,
		}
		c.JSON(http.StatusOK, response)
		return
	}

	// Convert prerequisites
	prerequisites := make([]models.ConceptInfo, len(result.Prerequisites))
	for i, prereq := range result.Prerequisites {
		prerequisites[i] = models.ConceptInfo{
			ID:          prereq.ID,
			Name:        prereq.Name,
			Description: prereq.Description,
			Type:        "prerequisite",
		}
	}

	// Convert leads_to
	leadsTo := make([]models.ConceptInfo, len(result.LeadsTo))
	for i, next := range result.LeadsTo {
		leadsTo[i] = models.ConceptInfo{
			ID:          next.ID,
			Name:        next.Name,
			Description: next.Description,
			Type:        "next_concept",
		}
	}

	response := models.ConceptDetailResponse{
		Success: true,
		Concept: &models.ConceptInfo{
			ID:          result.Concept.ID,
			Name:        result.Concept.Name,
			Description: result.Concept.Description,
			Type:        "target",
		},
		Prerequisites:       prerequisites,
		LeadsTo:             leadsTo,
		DetailedExplanation: result.DetailedExplanation,
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) ListConcepts(c *gin.Context) {
	concepts, err := h.container.QueryService().GetAllConcepts(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to list concepts", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.logger.Info("Retrieved concepts for listing", zap.Int("total_concepts", len(concepts)))
	for i, concept := range concepts {
		if i < 5 { // Log first 5 for debugging
			h.logger.Info("Concept in database",
				zap.String("id", concept.ID),
				zap.String("name", concept.Name))
		}
	}

	response := make([]models.ConceptInfo, len(concepts))
	for i, concept := range concepts {
		response[i] = models.ConceptInfo{
			ID:          concept.ID,
			Name:        concept.Name,
			Description: concept.Description,
			Type:        "concept",
		}
	}

	c.JSON(http.StatusOK, response)
}

// HealthCheck provides comprehensive health check
func (h *Handler) HealthCheck(c *gin.Context) {
	ctx := c.Request.Context()

	// Get health check from container
	healthStatus := h.container.HealthCheck(ctx)

	systemHealth := "healthy"
	for service, healthy := range healthStatus {
		if !healthy {
			systemHealth = "degraded"
			h.logger.Warn("Service unhealthy", zap.String("service", service))
		}
	}

	// Check if this is a detailed health check
	if c.Request.URL.Path == "/api/v1/health-detailed" {
		c.JSON(http.StatusOK, gin.H{
			"status":    systemHealth,
			"timestamp": time.Now().UTC(),
			"uptime":    time.Since(h.startTime).String(),
			"version":   "1.0.0",
			"services":  healthStatus,
		})
		return
	}

	// Simple health check
	statusCode := http.StatusOK
	if systemHealth == "degraded" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, gin.H{
		"status":    systemHealth,
		"timestamp": time.Now().UTC(),
		"uptime":    time.Since(h.startTime).String(),
	})
}

// SmartConceptQuery handles concept queries with MongoDB cache checking
func (h *Handler) SmartConceptQuery(c *gin.Context) {
	requestID := getRequestID(c)
	startTime := time.Now()

	h.logger.Info("Smart concept query started", zap.String("request_id", requestID))

	var req models.ConceptQueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid concept query request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "Invalid request format",
			"error":      err.Error(),
			"request_id": requestID,
		})
		return
	}

	// Validate concept name
	conceptName := strings.TrimSpace(req.ConceptName)
	if conceptName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "Concept name is required",
			"request_id": requestID,
		})
		return
	}

	userID := req.UserID
	if userID == "" {
		userID = "anonymous_" + requestID[:8]
	}

	h.logger.Info("Processing smart concept query",
		zap.String("concept", conceptName),
		zap.String("user_id", userID),
		zap.String("request_id", requestID))

	// Call the service method
	result, err := h.container.QueryService().SmartConceptQuery(
		c.Request.Context(),
		conceptName,
		userID,
		requestID,
	)

	if err != nil {
		h.logger.Error("Smart concept query failed",
			zap.String("concept", conceptName),
			zap.Error(err))

		c.JSON(http.StatusInternalServerError, gin.H{
			"success":         false,
			"message":         "Failed to process concept query",
			"concept_name":    conceptName,
			"error":           err.Error(),
			"request_id":      requestID,
			"processing_time": time.Since(startTime).String(),
		})
		return
	}

	// Determine source (cache vs fresh processing)
	source := "processed"
	var cacheAge *time.Duration

	// If query was completed very quickly (< 1 second), it was likely from cache
	if result.ProcessingTime < time.Second {
		source = "cache"
		if result.Query != nil {
			age := time.Since(result.Query.Timestamp)
			cacheAge = &age
		}
	}

	// Convert prerequisite path
	var learningPath models.LearningPath
	for _, concept := range result.PrerequisitePath {
		learningPath.Concepts = append(learningPath.Concepts, models.ConceptInfo{
			ID:          concept.ID,
			Name:        concept.Name,
			Description: concept.Description,
			Type:        concept.Type,
		})
	}
	learningPath.TotalConcepts = len(learningPath.Concepts)

	// Get educational resources if available
	var educationalResources []scraper.EducationalResource
	resourcesMessage := ""

	if len(result.IdentifiedConcepts) > 0 {
		// Try to get existing resources
		resources, err := h.container.QueryService().GetResourcesForConcepts(
			c.Request.Context(),
			result.IdentifiedConcepts,
			10,
		)
		if err == nil && len(resources) > 0 {
			educationalResources = resources
			resourcesMessage = fmt.Sprintf("Found %d educational resources", len(resources))
		} else {
			resourcesMessage = "Educational resources are being gathered in the background"
		}
	}

	// Build response
	response := models.ConceptQueryResponse{
		Success:              true,
		ConceptName:          conceptName,
		Source:               source,
		IdentifiedConcepts:   result.IdentifiedConcepts,
		LearningPath:         learningPath,
		Explanation:          result.Explanation,
		RetrievedContext:     result.RetrievedContext,
		ProcessingTime:       time.Since(startTime),
		CacheAge:             cacheAge,
		RequestID:            requestID,
		Timestamp:            time.Now(),
		EducationalResources: educationalResources,
		ResourcesMessage:     resourcesMessage,
	}

	h.logger.Info("Smart concept query completed successfully",
		zap.String("concept", conceptName),
		zap.String("source", source),
		zap.Duration("processing_time", response.ProcessingTime),
		zap.String("request_id", requestID))

	c.JSON(http.StatusOK, response)
}
