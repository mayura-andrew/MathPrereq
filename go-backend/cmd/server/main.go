package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mathprereq/internal/api/routes"
	"github.com/mathprereq/internal/container"
	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/pkg/logger"
	"go.uber.org/zap"
)

const (
	AppName    = "mathprereq-api"
	AppVersion = "2.0.0"
)

type Server struct {
	httpServer *http.Server
	container  container.Container
	logger     *zap.Logger
	config     *config.Config
}

func main() {
	// Initialize logger first
	if err := logger.Initialize(); err != nil {
		panic(fmt.Sprintf("Failed to initialize logger: %v", err))
	}
	defer logger.Sync()

	log := logger.GetLogger()
	log.Info("Starting MathPrereq API Server",
		zap.String("app", AppName),
		zap.String("version", AppVersion))

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load configuration", zap.Error(err))
	}

	log.Info("Configuration loaded",
		zap.String("environment", cfg.Server.Environment),
		zap.Int("port", cfg.Server.Port),
		zap.String("log_level", cfg.Logging.Level))

	// Initialize dependency injection container
	log.Info("Initializing dependency container...")
	appContainer, err := container.NewContainer(cfg)
	if err != nil {
		log.Fatal("Failed to initialize container", zap.Error(err))
	}

	// Create server instance
	server := &Server{
		container: appContainer,
		logger:    log,
		config:    cfg,
	}

	// Setup and start server
	if err := server.Start(); err != nil {
		log.Fatal("Failed to start server", zap.Error(err))
	}

	// Wait for shutdown signal
	server.WaitForShutdown()
}

func (s *Server) Start() error {
	// Setup routes
	router := routes.SetupRoutes(s.container, s.config, s.logger)

	// Configure HTTP server
	s.httpServer = &http.Server{
		Addr:           fmt.Sprintf("%s:%d", s.config.Server.Host, s.config.Server.Port),
		Handler:        router,
		ReadTimeout:    s.config.Server.ReadTimeout,
		WriteTimeout:   s.config.Server.WriteTimeout,
		IdleTimeout:    s.config.Server.IdleTimeout,
		MaxHeaderBytes: int(s.config.Server.MaxBodySize),
	}

	// Health check before starting
	s.logger.Info("Performing startup health checks...")
	if err := s.performStartupHealthCheck(); err != nil {
		return fmt.Errorf("startup health check failed: %w", err)
	}

	// Start server in a goroutine
	go func() {
		s.logger.Info("Starting HTTP server",
			zap.String("address", s.httpServer.Addr),
			zap.String("environment", s.config.Server.Environment))

		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.logger.Fatal("Server startup failed", zap.Error(err))
		}
	}()

	s.logger.Info("Server started successfully",
		zap.String("address", s.httpServer.Addr),
		zap.String("version", AppVersion))

	return nil
}

func (s *Server) performStartupHealthCheck() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	s.logger.Info("Checking system health...")
	health := s.container.HealthCheck(ctx)

	unhealthyServices := []string{}
	for service, healthy := range health {
		if !healthy {
			unhealthyServices = append(unhealthyServices, service)
			s.logger.Error("Service health check failed", zap.String("service", service))
		} else {
			s.logger.Info("Service health check passed", zap.String("service", service))
		}
	}

	if len(unhealthyServices) > 0 {
		return fmt.Errorf("unhealthy services: %v", unhealthyServices)
	}

	s.logger.Info("All health checks passed")
	return nil
}

func (s *Server) WaitForShutdown() {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)

	sig := <-quit
	s.logger.Info("Shutdown signal received", zap.String("signal", sig.String()))

	s.Shutdown()
}

func (s *Server) Shutdown() {
	s.logger.Info("Starting graceful shutdown...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown HTTP server
	s.logger.Info("Shutting down HTTP server...")
	if err := s.httpServer.Shutdown(ctx); err != nil {
		s.logger.Error("HTTP server shutdown error", zap.Error(err))
	} else {
		s.logger.Info("HTTP server shutdown completed")
	}

	// Shutdown application container
	s.logger.Info("Shutting down application services...")
	if err := s.container.Shutdown(ctx); err != nil {
		s.logger.Error("Container shutdown error", zap.Error(err))
	} else {
		s.logger.Info("Container shutdown completed")
	}

	// Final log sync
	s.logger.Info("Graceful shutdown completed")
	logger.Sync()

	s.logger.Info("Server stopped")
}
