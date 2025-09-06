package logger

import (
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	globalLogger *zap.Logger
	once         sync.Once
)

func NewLogger() (*zap.Logger, error) {
	config := zap.NewProductionConfig()
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)

	logger, err := config.Build(
		zap.AddCallerSkip(1),
		zap.AddStacktrace(zapcore.ErrorLevel),
	)
	if err != nil {
		return nil, err
	}

	once.Do(func() {
		globalLogger = logger
	})

	return logger, nil
}

func MustGetLogger() *zap.Logger {
	if globalLogger == nil {
		logger, err := NewLogger()
		if err != nil {
			panic(err)
		}
		return logger
	}
	return globalLogger
}
