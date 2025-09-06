package routes

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"
	"github.com/mathprereq/internal/api/handlers"
	"github.com/mathprereq/internal/api/middleware"
)

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
	router.Use(requestid.New())
	router.Use(middleware.Logger())

	// Health check
	router.GET("/health", h.HealthCheck)

	// API routes
	v1 := router.Group("/api/v1")
	{
		v1.POST("/query", h.ProcessQuery)
		v1.POST("/concept-detail", h.GetConceptDetail)
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
