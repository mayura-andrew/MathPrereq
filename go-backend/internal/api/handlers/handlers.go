package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/mathprereq/internal/api/models"
	"github.com/mathprereq/internal/container"
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
