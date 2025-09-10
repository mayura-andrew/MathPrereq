package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mathprereq/internal/api/handlers"
	"github.com/mathprereq/internal/api/routes"
	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/internal/core/orchestrator"
	"github.com/mathprereq/internal/data/mongodb"
	"github.com/mathprereq/internal/data/neo4j"
	"github.com/mathprereq/internal/data/scraper"
	"github.com/mathprereq/internal/data/weaviate"
	"github.com/mathprereq/pkg/logger"
	"go.mongodb.org/mongo-driver/bson"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	zapLogger, err := logger.NewLogger()
	if err != nil {
		log.Fatal("Failed to initialize logger:", err)
	}
	defer zapLogger.Sync()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		zapLogger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Initialize databases
	neo4jClient, err := neo4j.NewClient(cfg.Neo4j)
	if err != nil {
		zapLogger.Fatal("Failed to initialize Neo4j", zap.Error(err))
	}
	defer neo4jClient.Close()

	weaviateClient, err := weaviate.NewClient(cfg.Weaviate)
	if err != nil {
		zapLogger.Fatal("Failed to initialize Weaviate", zap.Error(err))
	}

	// Initialize MongoDB with proper error handling
	mongoConfig := mongodb.Config{
		URI:            getEnvString("MONGODB_URI", "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin"),
		Database:       getEnvString("MONGODB_DATABASE", "mathprereq"),
		ConnectTimeout: 10 * time.Second,
		QueryTimeout:   30 * time.Second,
	}

	zapLogger.Info("Initializing MongoDB",
		zap.String("database", mongoConfig.Database),
		zap.String("uri", "mongodb://***:***@localhost:27017/mathprereq"))

	mongoClient, err := mongodb.NewClient(mongoConfig)
	if err != nil {
		zapLogger.Fatal("Failed to initialize MongoDB", zap.Error(err))
	}
	defer func() {
		if err := mongoClient.Close(context.Background()); err != nil {
			zapLogger.Error("Error closing MongoDB client", zap.Error(err))
		}
	}()

	// Test MongoDB connection with authentication verification
	testCtx, testCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer testCancel()

	if err := mongoClient.Ping(testCtx); err != nil {
		zapLogger.Fatal("Failed to ping MongoDB", zap.Error(err))
	}
	zapLogger.Info("MongoDB connection verified successfully")

	// Additional authentication test - try a simple database operation
	testDB := mongoClient.GetMongoClient().Database(mongoConfig.Database)
	collections, err := testDB.ListCollectionNames(testCtx, bson.M{})
	if err != nil {
		zapLogger.Warn("MongoDB authentication test failed - collections list", zap.Error(err))
	} else {
		zapLogger.Info("MongoDB authentication verified - can list collections", zap.Int("collections", len(collections)))
	}

	// Initialize web scraper (integrated into main server)
	var webScraper *scraper.EducationalWebScraper
	if mongoClient != nil {
		// Initialize web scraper configuration with the correct authenticated URI
		scraperConfig := scraper.ScraperConfig{
			MaxConcurrentRequests: getEnvInt("SCRAPER_MAX_CONCURRENT", 8),
			RequestTimeout:        time.Duration(getEnvInt("SCRAPER_TIMEOUT_SECONDS", 30)) * time.Second,
			RateLimit:             getEnvFloat("SCRAPER_RATE_LIMIT", 3.0),
			UserAgent:             getEnvString("SCRAPER_USER_AGENT", "MathPrereqBot/1.0 (+https://mathprereq.com/bot)"),
			MongoURI:              mongoConfig.URI, // Pass the authenticated URI
			DatabaseName:          mongoConfig.Database,
			CollectionName:        getEnvString("SCRAPER_COLLECTION", "educational_resources"),
			MaxRetries:            3,
			RetryDelay:            2 * time.Second,
		}

		// Create scraper with shared client but also pass the authenticated URI
		webScraper, err = scraper.New(scraperConfig, mongoClient.GetMongoClient())
		if err != nil {
			zapLogger.Warn("Failed to initialize web scraper, continuing without scraping features", zap.Error(err))
			webScraper = nil
		} else {
			zapLogger.Info("Web scraper initialized successfully with shared MongoDB client")

			// Test the scraper's MongoDB connection
			testCtx, testCancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer testCancel()

			// Test if scraper can access MongoDB
			testCollection := mongoClient.GetMongoClient().Database(scraperConfig.DatabaseName).Collection(scraperConfig.CollectionName)
			count, err := testCollection.CountDocuments(testCtx, bson.M{})
			if err != nil {
				zapLogger.Warn("Scraper MongoDB test failed - cannot count documents", zap.Error(err))
			} else {
				zapLogger.Info("Scraper MongoDB test passed - can access collection", zap.Int64("documents", count))
			}
		}
	} else {
		zapLogger.Warn("MongoDB client not available, skipping web scraper initialization")
	}

	// Initialize orchestrator
	orchestrator := orchestrator.New(neo4jClient, weaviateClient, cfg.LLM, mongoClient.GetMongoClient(), mongoConfig.Database)

	// Initialize handlers with MongoDB client and web scraper
	handlers := handlers.New(orchestrator, mongoClient, webScraper, zapLogger)

	// Setup router
	router := gin.New()
	routes.Setup(router, handlers)

	// Create HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Server.Port),
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		zapLogger.Info("Starting server", zap.Int("port", cfg.Server.Port))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			zapLogger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	zapLogger.Info("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		zapLogger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	zapLogger.Info("Server exited")
}

// Helper functions
func getEnvString(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseFloat(value, 64); err == nil {
			return parsed
		}
	}
	return defaultValue
}
