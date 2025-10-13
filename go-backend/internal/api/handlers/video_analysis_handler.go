package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mathprereq/internal/services"
	"github.com/mathprereq/pkg/logger"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.uber.org/zap"
)

// VideoAnalysisHandler handles video analysis API requests
type VideoAnalysisHandler struct {
	analyzerService *services.VideoAnalyzerService
	logger          *zap.Logger
}

// NewVideoAnalysisHandler creates a new video analysis handler
func NewVideoAnalysisHandler(analyzerService *services.VideoAnalyzerService) *VideoAnalysisHandler {
	return &VideoAnalysisHandler{
		analyzerService: analyzerService,
		logger:          logger.MustGetLogger(),
	}
}

// AnalyzeVideoByID analyzes a video by resource ID (async)
// POST /api/v1/resources/:id/analyze
func (h *VideoAnalysisHandler) AnalyzeVideoByID(c *gin.Context) {
	resourceID := c.Param("id")

	objectID, err := primitive.ObjectIDFromHex(resourceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID format"})
		return
	}

	// Start async analysis
	analysis, err := h.analyzerService.AnalyzeVideoResource(c.Request.Context(), objectID)
	if err != nil {
		h.logger.Error("Failed to start video analysis",
			zap.String("resource_id", resourceID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message":     "Analysis started",
		"analysis_id": analysis.ID.Hex(),
		"status":      analysis.Status,
	})
}

// AnalyzeVideoByIDSync analyzes a video synchronously (waits for completion)
// POST /api/v1/resources/:id/analyze/sync
func (h *VideoAnalysisHandler) AnalyzeVideoByIDSync(c *gin.Context) {
	resourceID := c.Param("id")

	objectID, err := primitive.ObjectIDFromHex(resourceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID format"})
		return
	}

	// Perform sync analysis
	analysis, err := h.analyzerService.AnalyzeVideoResourceSync(c.Request.Context(), objectID)
	if err != nil {
		h.logger.Error("Failed to analyze video",
			zap.String("resource_id", resourceID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, analysis)
}

// GetAnalysis retrieves an analysis by its ID
// GET /api/v1/analyses/:id
func (h *VideoAnalysisHandler) GetAnalysis(c *gin.Context) {
	analysisID := c.Param("id")

	objectID, err := primitive.ObjectIDFromHex(analysisID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid analysis ID format"})
		return
	}

	analysis, err := h.analyzerService.GetAnalysisByID(c.Request.Context(), objectID)
	if err != nil {
		h.logger.Error("Failed to get analysis",
			zap.String("analysis_id", analysisID),
			zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Analysis not found"})
		return
	}

	c.JSON(http.StatusOK, analysis)
}

// GetAnalysisByResourceID retrieves analysis for a resource
// GET /api/v1/resources/:id/analysis
func (h *VideoAnalysisHandler) GetAnalysisByResourceID(c *gin.Context) {
	resourceID := c.Param("id")

	objectID, err := primitive.ObjectIDFromHex(resourceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID format"})
		return
	}

	analysis, err := h.analyzerService.GetAnalysisByResourceID(c.Request.Context(), objectID)
	if err != nil {
		h.logger.Error("Failed to get analysis",
			zap.String("resource_id", resourceID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if analysis == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No analysis found for this resource"})
		return
	}

	c.JSON(http.StatusOK, analysis)
}

// BatchAnalyzeVideos analyzes multiple videos
// POST /api/v1/resources/analyze/batch
func (h *VideoAnalysisHandler) BatchAnalyzeVideos(c *gin.Context) {
	var request struct {
		ResourceIDs   []string `json:"resource_ids" binding:"required"`
		MaxConcurrent int      `json:"max_concurrent"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if len(request.ResourceIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "resource_ids is required"})
		return
	}

	// Convert to ObjectIDs
	objectIDs := make([]primitive.ObjectID, 0, len(request.ResourceIDs))
	for _, id := range request.ResourceIDs {
		objectID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource ID: " + id})
			return
		}
		objectIDs = append(objectIDs, objectID)
	}

	if request.MaxConcurrent <= 0 {
		request.MaxConcurrent = 3
	}

	// Start batch analysis in background
	go func() {
		if err := h.analyzerService.BatchAnalyzeVideos(context.Background(), objectIDs, request.MaxConcurrent); err != nil {
			h.logger.Error("Batch analysis failed", zap.Error(err))
		}
	}()

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Batch analysis started",
		"count":   len(objectIDs),
	})
}

// RegisterRoutes registers the video analysis routes with Gin router
func (h *VideoAnalysisHandler) RegisterRoutes(router *gin.RouterGroup) {
	// Analysis endpoints
	router.POST("/resources/:id/analyze", h.AnalyzeVideoByID)
	router.POST("/resources/:id/analyze/sync", h.AnalyzeVideoByIDSync)
	router.GET("/resources/:id/analysis", h.GetAnalysisByResourceID)
	router.GET("/analyses/:id", h.GetAnalysis)
	router.POST("/resources/analyze/batch", h.BatchAnalyzeVideos)
}
	
