package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mathprereq/internal/data/scraper"
	"go.mongodb.org/mongo-driver/bson"
	"go.uber.org/zap"
)

// ResourceRequest represents a request to find resources
type ResourceRequest struct {
	ConceptName string `json:"concept_name" binding:"required"`
	Limit       int    `json:"limit,omitempty"`
}

// BatchResourceRequest represents a batch request to find resources
type BatchResourceRequest struct {
	ConceptNames []string `json:"concept_names" binding:"required"`
	Limit        int      `json:"limit,omitempty"`
}

// ResourceResponse represents a resource response
type ResourceResponse struct {
	Success    bool                          `json:"success"`
	Message    string                        `json:"message"`
	Resources  []scraper.EducationalResource `json:"resources,omitempty"`
	TotalFound int                           `json:"total_found,omitempty"`
	RequestID  string                        `json:"request_id"`
}

// ResourceManager manages scraper instances and connections
type ResourceManager struct {
	scraper *scraper.EducationalWebScraper
	logger  *zap.Logger
	mutex   sync.RWMutex
}

// Global resource manager instance
var (
	resourceManager *ResourceManager
	resourceOnce    sync.Once
)

// getResourceManager returns a singleton resource manager
func (h *Handler) getResourceManager() *ResourceManager {
	resourceOnce.Do(func() {
		h.logger.Info("Initializing resource manager with authenticated MongoDB client")

		// Get the raw MongoDB client with proper authentication
		rawClient := h.container.GetRawMongoClient()
		if rawClient == nil {
			h.logger.Error("Failed to get authenticated MongoDB client for resource manager")
			return
		}

		// Comprehensive authentication testing
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		// Test 1: Basic connectivity
		if err := rawClient.Ping(ctx, nil); err != nil {
			h.logger.Error("MongoDB client ping failed during resource manager init", zap.Error(err))
			return
		}
		h.logger.Info("✅ MongoDB ping successful")

		// Test 2: Database access with actual collection operations
		testDB := rawClient.Database("mathprereq")
		testCollection := testDB.Collection("educational_resources")

		// Test count operation (requires read permissions)
		count, err := testCollection.CountDocuments(ctx, bson.M{})
		if err != nil {
			h.logger.Error("MongoDB authentication test failed - cannot access collection",
				zap.Error(err),
				zap.String("error_type", fmt.Sprintf("%T", err)))

			// Check if this is specifically an auth error
			if strings.Contains(err.Error(), "authentication") ||
				strings.Contains(err.Error(), "Unauthorized") ||
				strings.Contains(err.Error(), "not authorized") {
				h.logger.Error("❌ MongoDB authentication failure - check credentials and permissions")
			}
			return
		}
		h.logger.Info("✅ MongoDB read access verified", zap.Int64("existing_resources", count))

		// Test 3: Write permissions test
		testDoc := bson.M{
			"test":      "resource_manager_auth_test",
			"timestamp": time.Now(),
			"purpose":   "authentication_verification",
		}

		insertResult, err := testCollection.InsertOne(ctx, testDoc)
		if err != nil {
			h.logger.Error("❌ MongoDB write access test failed", zap.Error(err))
			return
		}
		h.logger.Info("✅ MongoDB write access verified")

		// Clean up test document
		if _, err := testCollection.DeleteOne(ctx, bson.M{"_id": insertResult.InsertedID}); err != nil {
			h.logger.Warn("Failed to clean up test document", zap.Error(err))
		}

		// Create optimized scraper config
		scraperConfig := scraper.ScraperConfig{
			MaxConcurrentRequests: 5,
			RequestTimeout:        30 * time.Second,
			RateLimit:             2.0, // 2 requests per second
			UserAgent:             "MathPrereq-ResourceFinder/2.0",
			DatabaseName:          "mathprereq",
			CollectionName:        "educational_resources",
			MaxRetries:            3,
			RetryDelay:            2 * time.Second,
		}

		// Initialize shared scraper instance with the authenticated client
		webScraper, err := scraper.New(scraperConfig, rawClient)
		if err != nil {
			h.logger.Error("Failed to initialize shared scraper", zap.Error(err))
			return
		}

		// Test that the scraper can access the database
		scraperStats, err := webScraper.GetResourceStats(ctx)
		if err != nil {
			h.logger.Warn("Scraper database access test failed, but proceeding anyway", zap.Error(err))
			// Don't fail here - the scraper might work for writes even if stats fail
		} else {
			h.logger.Info("✅ Scraper database access verified", zap.Any("stats", scraperStats))
		}

		resourceManager = &ResourceManager{
			scraper: webScraper,
			logger:  h.logger,
		}

		h.logger.Info("🎉 Resource manager initialized successfully with authenticated MongoDB client")
	})

	return resourceManager
}

// getRequestID safely extracts request ID from context
func getRequestID(c *gin.Context) string {
	if requestID := c.GetString("request_id"); requestID != "" {
		return requestID
	}
	if requestID := c.GetHeader("X-Request-ID"); requestID != "" {
		return requestID
	}
	return "unknown"
}

// FindResourcesForConcept handles POST /api/v1/resources/find/:concept
func (h *Handler) FindResourcesForConcept(c *gin.Context) {
	requestID := getRequestID(c)
	concept := c.Param("concept")

	if concept == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "Concept parameter is required",
			"request_id": requestID,
		})
		return
	}

	// Decode and sanitize URL parameter
	concept = strings.ReplaceAll(concept, "%20", " ")
	concept = strings.TrimSpace(concept)

	h.logger.Info("Finding resources for concept",
		zap.String("concept", concept),
		zap.String("request_id", requestID))

	// Get shared resource manager
	manager := h.getResourceManager()
	if manager == nil || manager.scraper == nil {
		h.logger.Error("Resource manager not available")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Resource service not available",
			"request_id": requestID,
		})
		return
	}

	// Use the shared scraper instance
	ctx, cancel := context.WithTimeout(c.Request.Context(), 55*time.Second)
	defer cancel()

	// Start scraping asynchronously
	go func() {
		manager.mutex.Lock()
		defer manager.mutex.Unlock()

		if err := manager.scraper.ScrapeResourcesForConcepts(ctx, []string{concept}); err != nil {
			h.logger.Warn("Scraping completed with errors",
				zap.Error(err),
				zap.String("concept", concept))
		}
	}()

	// Wait briefly for potential immediate results
	time.Sleep(2 * time.Second)

	// Get current resources using shared scraper
	conceptID := generateConceptID(concept)
	resources, err := manager.scraper.GetResourcesForConcept(ctx, conceptID, 10)
	if err != nil {
		h.logger.Warn("Failed to get resources",
			zap.Error(err),
			zap.String("concept", concept))
		resources = []scraper.EducationalResource{} // Return empty slice on error
	}

	h.logger.Info("Resource finding initiated",
		zap.String("concept", concept),
		zap.Int("immediate_resources", len(resources)),
		zap.String("request_id", requestID))

	c.JSON(http.StatusOK, ResourceResponse{
		Success:    true,
		Message:    "Resource finding initiated. Check back in a few minutes for more results.",
		Resources:  resources,
		TotalFound: len(resources),
		RequestID:  requestID,
	})
}

// GetResourcesForConcept handles GET /api/v1/resources/concept/:concept
func (h *Handler) GetResourcesForConcept(c *gin.Context) {
	requestID := getRequestID(c)
	concept := c.Param("concept")

	if concept == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "Concept parameter is required",
			"request_id": requestID,
		})
		return
	}

	// Parse limit parameter
	limit := 20 // default
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Decode URL parameter
	concept = strings.ReplaceAll(concept, "%20", " ")
	concept = strings.TrimSpace(concept)

	h.logger.Info("Getting resources for concept",
		zap.String("concept", concept),
		zap.Int("limit", limit),
		zap.String("request_id", requestID))

	// Get shared resource manager
	manager := h.getResourceManager()
	if manager == nil || manager.scraper == nil {
		h.logger.Error("Resource manager not available")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Resource service not available",
			"request_id": requestID,
		})
		return
	}

	// Get resources using shared scraper
	manager.mutex.RLock()
	defer manager.mutex.RUnlock()

	resources, err := manager.scraper.GetResourcesForConcept(c.Request.Context(),
		generateConceptID(concept), limit)
	if err != nil {
		h.logger.Error("Failed to get resources", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Failed to retrieve resources",
			"request_id": requestID,
		})
		return
	}

	h.logger.Info("Retrieved resources successfully",
		zap.String("concept", concept),
		zap.Int("count", len(resources)),
		zap.String("request_id", requestID))

	c.JSON(http.StatusOK, ResourceResponse{
		Success:    true,
		Message:    "Resources retrieved successfully",
		Resources:  resources,
		TotalFound: len(resources),
		RequestID:  requestID,
	})
}

// ListResources handles GET /api/v1/resources/
func (h *Handler) ListResources(c *gin.Context) {
	requestID := getRequestID(c)

	// Parse pagination parameters
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if parsedPage, err := strconv.Atoi(pageStr); err == nil && parsedPage > 0 {
			page = parsedPage
		}
	}

	limit := 50 // default
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	h.logger.Info("Listing resources",
		zap.Int("page", page),
		zap.Int("limit", limit),
		zap.String("request_id", requestID))

	// TODO: Implement pagination logic with MongoDB aggregation
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Resource listing feature coming soon",
		"page":       page,
		"limit":      limit,
		"request_id": requestID,
	})
}

// GetResourceStats handles GET /api/v1/resources/stats
func (h *Handler) GetResourceStats(c *gin.Context) {
	requestID := getRequestID(c)

	h.logger.Info("Getting resource statistics", zap.String("request_id", requestID))

	// Get shared resource manager
	manager := h.getResourceManager()
	if manager == nil || manager.scraper == nil {
		h.logger.Error("Resource manager not available")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Resource service not available",
			"request_id": requestID,
		})
		return
	}

	// Get resource statistics using shared scraper
	manager.mutex.RLock()
	defer manager.mutex.RUnlock()

	stats, err := manager.scraper.GetResourceStats(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to get resource statistics", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Failed to retrieve resource statistics",
			"request_id": requestID,
		})
		return
	}

	h.logger.Info("Retrieved resource statistics successfully",
		zap.Any("stats", stats),
		zap.String("request_id", requestID))

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Resource statistics retrieved successfully",
		"stats":      stats,
		"request_id": requestID,
	})
}

// FindResourcesForConcepts handles POST /api/v1/resources/find-batch
func (h *Handler) FindResourcesForConcepts(c *gin.Context) {
	requestID := getRequestID(c)

	var req BatchResourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Warn("Invalid batch resource request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "Invalid request format",
			"error":      err.Error(),
			"request_id": requestID,
		})
		return
	}

	if len(req.ConceptNames) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "At least one concept name is required",
			"request_id": requestID,
		})
		return
	}

	// Limit batch size
	if len(req.ConceptNames) > 10 {
		req.ConceptNames = req.ConceptNames[:10]
	}

	h.logger.Info("Finding resources for multiple concepts",
		zap.Strings("concepts", req.ConceptNames),
		zap.String("request_id", requestID))

	// Get shared resource manager
	manager := h.getResourceManager()
	if manager == nil || manager.scraper == nil {
		h.logger.Error("Resource manager not available")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success":    false,
			"message":    "Resource service not available",
			"request_id": requestID,
		})
		return
	}

	// Start batch scraping in background using shared scraper
	ctx, cancel := context.WithTimeout(c.Request.Context(), 110*time.Second)
	defer cancel()

	go func() {
		manager.mutex.Lock()
		defer manager.mutex.Unlock()

		if err := manager.scraper.ScrapeResourcesForConcepts(ctx, req.ConceptNames); err != nil {
			h.logger.Warn("Batch scraping completed with errors",
				zap.Error(err),
				zap.Strings("concepts", req.ConceptNames))
		}
	}()

	h.logger.Info("Batch resource finding initiated",
		zap.Strings("concepts", req.ConceptNames),
		zap.String("request_id", requestID))

	c.JSON(http.StatusAccepted, gin.H{
		"success":        true,
		"message":        "Batch resource finding initiated. This may take several minutes to complete.",
		"concepts_count": len(req.ConceptNames),
		"request_id":     requestID,
	})
}

// Helper function to generate concept ID (same as scraper)
func generateConceptID(conceptName string) string {
	id := strings.ToLower(conceptName)
	id = strings.ReplaceAll(id, " ", "_")
	id = strings.ReplaceAll(id, "-", "_")
	// Remove special characters
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			return r
		}
		return -1
	}, id)
}
