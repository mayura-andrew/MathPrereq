package logger

import (
	"fmt"
	"os"
	"strings"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var globalLogger *zap.Logger

func Initialize() error {
	logLevel := strings.ToLower(os.Getenv("LOG_LEVEL"))
	if logLevel == "" {
		logLevel = "info"
	}

	logFormat := strings.ToLower(os.Getenv("LOG_FORMAT"))
	if logFormat == "" {
		logFormat = "json"
	}

	var config zap.Config

	if logFormat == "console" {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	} else {
		config = zap.NewProductionConfig()
	}

	// Set log level
	switch logLevel {
	case "debug":
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
	case "info":
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
	case "warn", "warning":
		config.Level = zap.NewAtomicLevelAt(zap.WarnLevel)
	case "error":
		config.Level = zap.NewAtomicLevelAt(zap.ErrorLevel)
	default:
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
	}

	// Add caller information

	// Custom time format
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	// Add service name
	config.InitialFields = map[string]interface{}{
		"service": "mathprereq-api",
		"version": "2.0.0",
	}

	logger, err := config.Build(zap.AddCaller(),
		zap.AddStacktrace(zapcore.ErrorLevel))
	if err != nil {
		return fmt.Errorf("failed to initialize logger: %w", err)
	}

	globalLogger = logger
	zap.ReplaceGlobals(logger)

	return nil
}

func GetLogger() *zap.Logger {
	if globalLogger == nil {
		// Fallback logger
		globalLogger, _ = zap.NewProduction()
	}
	return globalLogger
}

func MustGetLogger() *zap.Logger {
	if globalLogger == nil {
		panic("Logger not initialized. Call Initialize() first.")
	}
	return globalLogger
}

func Sync() {
	if globalLogger != nil {
		globalLogger.Sync()
	}
}
