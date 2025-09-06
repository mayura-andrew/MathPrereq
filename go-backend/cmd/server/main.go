package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mathprereq/internal/api/handlers"
	"github.com/mathprereq/internal/api/routes"
	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/internal/core/orchestrator"
	"github.com/mathprereq/internal/data/neo4j"
	"github.com/mathprereq/internal/data/weaviate"
	"github.com/mathprereq/pkg/logger"
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

	// Initialize orchestrator
	orchestrator := orchestrator.New(neo4jClient, weaviateClient, cfg.LLM)

	// Initialize handlers
	handlers := handlers.New(orchestrator, zapLogger)

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
