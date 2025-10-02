package middleware

import (
	"context"
	"fmt"
	"math/rand"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// RequestID middleware adds unique request ID to each request
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)

		// Add request ID to context for downstream services
		ctx := context.WithValue(c.Request.Context(), "request_id", requestID)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}

// RequestLogger provides structured logging for all HTTP requests
func RequestLogger(logger *zap.Logger) gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		requestID, _ := param.Keys["request_id"].(string)

		// Create structured log entry
		fields := []zap.Field{
			zap.String("request_id", requestID),
			zap.String("method", param.Method),
			zap.String("path", param.Path),
			zap.Int("status", param.StatusCode),
			zap.Duration("latency", param.Latency),
			zap.String("client_ip", param.ClientIP),
			zap.String("user_agent", param.Request.UserAgent()),
			zap.Int("body_size", param.BodySize),
		}

		// Add error information if present
		if param.ErrorMessage != "" {
			fields = append(fields, zap.String("error", param.ErrorMessage))
		}

		// Log with appropriate level based on status code
		if param.StatusCode >= 500 {
			logger.Error("HTTP Request", fields...)
		} else if param.StatusCode >= 400 {
			logger.Warn("HTTP Request", fields...)
		} else {
			logger.Info("HTTP Request", fields...)
		}

		return ""
	})
}

// Timeout middleware adds timeout to request context
func Timeout(duration time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), duration)
		defer cancel()

		c.Request = c.Request.WithContext(ctx)

		// Use channel to track completion
		done := make(chan struct{})

		// Run handler in goroutine that signals completion
		go func() {
			defer func() {
				if r := recover(); r != nil {
					// Let recovery middleware handle panics
					panic(r)
				}
				close(done)
			}()
			c.Next()
		}()

		select {
		case <-done:
			// Handler completed
			return
		case <-ctx.Done():
			// Context cancelled (timeout or client disconnect)
			if ctx.Err() == context.DeadlineExceeded {
				c.AbortWithStatusJSON(http.StatusRequestTimeout, gin.H{
					"success":    false,
					"error":      "Request timeout - the operation took too long",
					"request_id": c.GetString("request_id"),
					"timeout":    duration.String(),
					"message":    "Please try again or simplify your query",
				})
			} else if ctx.Err() == context.Canceled {
				c.AbortWithStatusJSON(http.StatusRequestTimeout, gin.H{
					"success":    false,
					"error":      "Request cancelled",
					"request_id": c.GetString("request_id"),
				})
			}
			return
		}
	}
}

// ...existing code...

// Recovery middleware with enhanced error reporting
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return gin.RecoveryWithWriter(nil, func(c *gin.Context, err interface{}) {
		requestID := c.GetString("request_id")
		stack := string(debug.Stack())

		logger.Error("Panic recovered",
			zap.String("request_id", requestID),
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Any("error", err),
			zap.String("stack", stack))

		// Return structured error response
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"error":      "Internal server error",
			"request_id": requestID,
		})
	})
}

// CORS middleware for cross-origin requests
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Allow specific origins or all origins in development
		allowedOrigins := []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"https://mathprereq.com",
			"https://app.mathprereq.com",
		}

		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		if allowed || gin.Mode() == gin.DebugMode {
			c.Header("Access-Control-Allow-Origin", origin)
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Request-ID")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// Security headers middleware
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		c.Next()
	}
}

// Helper function to generate request ID
func generateRequestID() string {
	// Generate a simple UUID-like string
	return fmt.Sprintf("%d-%d", time.Now().UnixNano(), rand.Intn(10000))
}
