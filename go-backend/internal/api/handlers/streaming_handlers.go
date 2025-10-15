package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mathprereq/internal/api/models"
	"github.com/mathprereq/internal/domain/entities"
	"github.com/mathprereq/internal/domain/services"
	"go.uber.org/zap"
)

// StreamQuery handles streaming query requests using Server-Sent Events (SSE)
func (h *Handler) StreamQuery(c *gin.Context) {
	var req models.QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// Validation
	if req.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Question is required",
		})
		return
	}

	requestID := getRequestID(c)
	h.logger.Info("Processing streaming query",
		zap.String("query", req.Question[:min(len(req.Question), 100)]),
		zap.String("request_id", requestID))

	// Set headers for Server-Sent Events
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // Disable nginx buffering

	// Get writer and flusher
	w := c.Writer
	flusher, ok := w.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Streaming not supported",
		})
		return
	}

	// Create event channel
	eventChan := make(chan entities.StreamEvent, 10)

	// Create service request
	serviceReq := &services.QueryRequest{
		UserID:    req.UserID,
		Question:  req.Question,
		RequestID: requestID,
	}

	// Get query service from container
	queryService := h.container.QueryService()

	// Process query in background
	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	go func() {
		if err := queryService.ProcessQueryStream(ctx, serviceReq, eventChan); err != nil {
			h.logger.Error("Streaming query processing failed", zap.Error(err))
		}
	}()

	// Stream events to client
	for event := range eventChan {
		// Format as SSE
		data, err := json.Marshal(event)
		if err != nil {
			h.logger.Error("Failed to marshal event", zap.Error(err))
			continue
		}

		// Write SSE format: "data: {json}\n\n"
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()

		// Check if client disconnected
		select {
		case <-c.Request.Context().Done():
			h.logger.Info("Client disconnected from stream")
			return
		default:
		}
	}

	h.logger.Info("Streaming query completed successfully",
		zap.String("request_id", requestID))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
