package routes

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mathprereq/internal/api/handlers"
	"github.com/mathprereq/internal/api/middleware"
	"github.com/mathprereq/internal/container"
	"github.com/mathprereq/internal/core/config"
	"go.uber.org/zap"
)

func SetupRoutes(
	container container.Container,
	cfg *config.Config,
	logger *zap.Logger,
) *gin.Engine {
	// Set Gin mode based on environment
	if cfg.Server.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Global middleware
	router.Use(middleware.RequestID())
	router.Use(middleware.RequestLogger(logger))
	router.Use(middleware.Recovery(logger))
	router.Use(middleware.CORS())
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.Timeout(50 * time.Second))

	// Initialize handlers
	handler := handlers.NewHandler(container, logger)
	adminHandler := handlers.NewAdminHandler(container.QueryService(), logger)

	// Health checks (no timeout)
	router.GET("/health", handler.HealthCheck)
	router.GET("/api/v1/health", handler.HealthCheck)
	router.GET("/api/v1/health-detailed", handler.HealthCheck)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Query processing
		v1.POST("/query",
			middleware.Timeout(45*time.Second),
			handler.ProcessQuery)

		// Concept operations
		v1.POST("/concept-detail",
			middleware.Timeout(15*time.Second),
			handler.GetConceptDetail)

		v1.GET("/concepts",
			middleware.Timeout(30*time.Second),
			handler.ListConcepts)

		// Learning Resources (New Feature)
		resources := v1.Group("/resources")
		{
			// Find and scrape resources for a concept (triggered by button click)
			resources.POST("/find/:concept",
				middleware.Timeout(60*time.Second), // Longer timeout for scraping
				handler.FindResourcesForConcept)

			// Get stored resources for a concept
			resources.GET("/concept/:concept",
				middleware.Timeout(15*time.Second),
				handler.GetResourcesForConcept)

			// Get all resources with pagination and filtering
			resources.GET("/",
				middleware.Timeout(30*time.Second),
				handler.ListResources)

			// Get resource statistics and analytics
			resources.GET("/stats",
				middleware.Timeout(15*time.Second),
				handler.GetResourceStats)

			// Bulk find resources for multiple concepts
			resources.POST("/find-batch",
				middleware.Timeout(120*time.Second), // Extended for batch operations
				handler.FindResourcesForConcepts)
		}

		// Admin routes for concept staging
		admin := v1.Group("/admin")
		{
			admin.GET("/staged-concepts/pending",
				middleware.Timeout(30*time.Second),
				adminHandler.GetPendingConcepts)

			admin.GET("/staged-concepts/stats",
				middleware.Timeout(15*time.Second),
				adminHandler.GetStagedConceptStats)

			admin.POST("/staged-concepts/:id/review",
				middleware.Timeout(30*time.Second),
				adminHandler.ReviewStagedConcept)
		}

		// Smart concept query - checks MongoDB first, then processes if needed
		v1.POST("/concept-query",
			middleware.Timeout(3*time.Minute),
			handler.SmartConceptQuery)
	}

	// Debug routes (only in development)
	if cfg.Server.Environment == "development" {
		debug := router.Group("/debug")
		{
			debug.GET("/config", func(c *gin.Context) {
				// Return sanitized config (without sensitive info)
				sanitizedCfg := *cfg
				sanitizedCfg.MongoDB.URI = maskSensitive(cfg.MongoDB.URI)
				sanitizedCfg.Neo4j.Password = "***"
				sanitizedCfg.LLM.APIKey = "***"
				sanitizedCfg.Weaviate.APIKey = "***"
				c.JSON(200, sanitizedCfg)
			})

			debug.GET("/health-check", func(c *gin.Context) {
				health := container.HealthCheck(c.Request.Context())
				c.JSON(200, gin.H{
					"health_status": health,
					"all_healthy":   allHealthy(health),
				})
			})

			// New debug endpoint for cached concepts
			debug.GET("/cached-concepts", func(c *gin.Context) {
				limit := 20 // Default limit
				if limitStr := c.Query("limit"); limitStr != "" {
					if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
						limit = parsedLimit
					}
				}

				queries, err := container.QueryService().GetCachedConcepts(c.Request.Context(), limit)
				if err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}

				// Simplify response for debugging
				simplified := make([]gin.H, len(queries))
				for i, query := range queries {
					simplified[i] = gin.H{
						"id":                  query.ID,
						"identified_concepts": query.IdentifiedConcepts,
						"timestamp":           query.Timestamp,
						"success":             query.Success,
						"explanation_length":  len(query.Response.Explanation),
						"prerequisite_count":  len(query.PrerequisitePath),
					}
				}

				c.JSON(200, gin.H{
					"cached_concepts": simplified,
					"total_count":     len(simplified),
					"limit":           limit,
					"timestamp":       time.Now(),
				})
			})
		}
	}

	return router
}

func maskSensitive(uri string) string {
	// Simple masking for URIs containing credentials
	if len(uri) > 20 {
		return uri[:10] + "***" + uri[len(uri)-7:]
	}
	return "***"
}

func allHealthy(health map[string]bool) bool {
	for _, healthy := range health {
		if !healthy {
			return false
		}
	}
	return true
}
