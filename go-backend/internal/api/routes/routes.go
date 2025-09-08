package routes

import (
	"context"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/mathprereq/internal/api/handlers"
	"github.com/mathprereq/internal/api/middleware"
)

// Request timeout middleware for long-running operations
func RequestTimeoutMiddleware(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

func Setup(router *gin.Engine, h *handlers.Handlers) {
	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))
	router.Use(middleware.Logger())

	// Health check
	router.GET("/health", h.HealthCheck)

	// API routes with extended timeout for query operations
	v1 := router.Group("/api/v1")
	{
		// Apply extended timeout only to query endpoints
		queryGroup := v1.Group("/")
		queryGroup.Use(RequestTimeoutMiddleware(10 * time.Minute)) // Extended timeout
		{
			queryGroup.POST("/query", h.ProcessQuery)
			queryGroup.POST("/concept-detail", h.GetConceptDetail)
		}

		// Standard timeout for other endpoints
		v1.GET("/concepts", h.ListConcepts)
		v1.GET("/health-detailed", h.HealthCheck)
	}

	// Root endpoint
	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Mathematics Learning Framework API",
			"version": "0.1.0",
			"docs":    "/docs",
		})
	})
}
