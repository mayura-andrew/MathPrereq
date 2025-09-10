package middleware

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/mathprereq/pkg/logger"
	"go.uber.org/zap"
)

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := uuid.New().String()
		c.Header("X-Request-ID", requestID)
		c.Set("request_id", requestID)
		c.Next()
	}
}

func Logger() gin.HandlerFunc {
	logger := logger.MustGetLogger()

	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()
		bodySize := c.Writer.Size()

		if raw != "" {
			path = path + "?" + raw
		}

		// Safe request ID extraction
		var requestIDStr string
		if requestID, exists := c.Get("request_id"); exists && requestID != nil {
			if idStr, ok := requestID.(string); ok {
				requestIDStr = idStr
			} else {
				requestIDStr = fmt.Sprintf("%v", requestID)
			}
		}

		logger.Info("HTTP Request",
			zap.String("request_id", requestIDStr),
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", statusCode),
			zap.String("client_ip", clientIP),
			zap.Duration("latency", latency),
			zap.Int("body_size", bodySize),
		)
	}
}

// Helper function to generate request ID
func generateRequestID() string {
	// Generate a simple UUID-like string
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), rand.Intn(10000))
}