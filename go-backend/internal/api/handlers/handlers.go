package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mathprereq/internal/api/models"
	"github.com/mathprereq/internal/core/orchestrator"
	"go.uber.org/zap"
)

type Handlers struct {
	orchestrator *orchestrator.Orchestrator
	logger       *zap.Logger
	startTime    time.Time
}

func New(orch *orchestrator.Orchestrator, logger *zap.Logger) *Handlers {
	return &Handlers{
		orchestrator: orch,
		logger:       logger,
		startTime:    time.Now(),
	}
}

func (h *Handlers) ProcessQuery(c *gin.Context) {
	start := time.Now()

	var req models.QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.logger.Info("Processing query", zap.String("question", req.Question[:min(len(req.Question), 100)]))

	result, err := h.orchestrator.ProcessQuery(c.Request.Context(), req.Question)
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
		c.JSON(http.StatusOK, response)
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

	h.logger.Info("Query processed successfully", zap.Duration("processing_time", processingTime))
	c.JSON(http.StatusOK, response)
}

func (h *Handlers) GetConceptDetail(c *gin.Context) {
	var req models.ConceptDetailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.logger.Info("Getting concept detail", zap.String("concept_id", req.ConceptID))

	result, err := h.orchestrator.GetConceptDetail(c.Request.Context(), req.ConceptID)
	if err != nil {
		h.logger.Error("Failed to get concept detail", zap.Error(err))
		errorMsg := err.Error()
		response := models.ConceptDetailResponse{
			Success:             false,
			Prerequisites:       []models.ConceptInfo{},
			LeadsTo:             []models.ConceptInfo{},
			DetailedExplanation: "",
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

func (h *Handlers) ListConcepts(c *gin.Context) {
	concepts, err := h.orchestrator.GetAllConcepts(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to list concepts", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
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

func (h *Handlers) HealthCheck(c *gin.Context) {
	uptime := time.Since(h.startTime).String()

	// Check system health
	kgHealthy := h.orchestrator.IsKnowledgeGraphHealthy(c.Request.Context())
	vsHealthy := h.orchestrator.IsVectorStoreHealthy(c.Request.Context())

	status := "healthy"
	if !kgHealthy || !vsHealthy {
		status = "unhealthy"
	}

	stats, _ := h.orchestrator.GetSystemStats(c.Request.Context())

	response := models.HealthResponse{
		Status:               status,
		Service:              "math-learning-framework",
		KnowledgeGraphLoaded: kgHealthy,
		VectorStoreLoaded:    vsHealthy,
		TotalConcepts:        stats.TotalConcepts,
		TotalChunks:          stats.TotalChunks,
		Uptime:               uptime,
	}

	c.JSON(http.StatusOK, response)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
