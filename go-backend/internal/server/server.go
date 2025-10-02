package server

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Server struct {
	httpServer *http.Server
	logger     *zap.Logger
}

func NewServer(router *gin.Engine, port string, logger *zap.Logger) *Server {
	return &Server{
		httpServer: &http.Server{
			Addr:              ":" + port,
			Handler:           router,
			ReadTimeout:       15 * time.Minute, // Increased for long requests
			ReadHeaderTimeout: 10 * time.Second,
			WriteTimeout:      60 * time.Minute, // Increased for long responses
			IdleTimeout:       120 * time.Minute,
			MaxHeaderBytes:    1 << 20, // 1MB
		},
		logger: logger,
	}
}

func (s *Server) Start() error {
	s.logger.Info("Starting server", zap.String("addr", s.httpServer.Addr))
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	s.logger.Info("Shutting down server")
	return s.httpServer.Shutdown(ctx)
}
