package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mathprereq/internal/domain/services"

	"go.uber.org/zap"
)

type AdminHandler struct {
	queryService services.QueryService
	logger       *zap.Logger
}

func NewAdminHandler(queryService services.QueryService, logger *zap.Logger) *AdminHandler {
	return &AdminHandler{
		queryService: queryService,
		logger:       logger,
	}
}

// GetPendingConcepts returns concepts awaiting review
// GET /api/v1/admin/staged-concepts/pending
func (h *AdminHandler) GetPendingConcepts(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	concepts, err := h.queryService.GetPendingConcepts(c.Request.Context(), limit, offset)
	if err != nil {
		h.logger.Error("Failed to get pending concepts", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get pending concepts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    concepts,
		"total":   len(concepts),
	})
}

// GetStagedConceptStats returns statistics about staged concepts
// GET /api/v1/admin/staged-concepts/stats
func (h *AdminHandler) GetStagedConceptStats(c *gin.Context) {
	stats, err := h.queryService.GetStagedConceptStats(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get staged concept stats", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats":   stats,
	})
}

type ReviewConceptRequest struct {
	ReviewerID string `json:"reviewer_id" binding:"required"`
	Action     string `json:"action" binding:"required,oneof=approve reject merge"`
	Notes      string `json:"notes"`

	// For merge action
	ExistingConceptID string `json:"existing_concept_id"`
}

// ReviewStagedConcept handles expert review of a staged concept
// POST /api/v1/admin/staged-concepts/:id/review
func (h *AdminHandler) ReviewStagedConcept(c *gin.Context) {
	stagedID := c.Param("id")

	var req ReviewConceptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var err error
	var message string

	switch req.Action {
	case "approve":
		err = h.queryService.ApproveStagedConcept(
			c.Request.Context(),
			stagedID,
			req.ReviewerID,
			req.Notes,
		)
		message = "Concept approved and added to knowledge graph"

	case "reject":
		err = h.queryService.RejectStagedConcept(
			c.Request.Context(),
			stagedID,
			req.ReviewerID,
			req.Notes,
		)
		message = "Concept rejected"

	case "merge":
		if req.ExistingConceptID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "existing_concept_id required for merge action"})
			return
		}
		err = h.queryService.MergeStagedConcept(
			c.Request.Context(),
			stagedID,
			req.ExistingConceptID,
			req.ReviewerID,
			req.Notes,
		)
		message = "Concept merged with existing concept"

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action"})
		return
	}

	if err != nil {
		h.logger.Error("Failed to review staged concept",
			zap.String("staged_id", stagedID),
			zap.String("action", req.Action),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.logger.Info("Staged concept reviewed successfully",
		zap.String("staged_id", stagedID),
		zap.String("action", req.Action),
		zap.String("reviewer", req.ReviewerID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
	})
}
