package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	MongoDB  MongoDBConfig  `mapstructure:"mongodb"`
	Neo4j    Neo4jConfig    `mapstructure:"neo4j"`
	Weaviate WeaviateConfig `mapstructure:"weaviate"`
	LLM      LLMConfig      `mapstructure:"llm"`
	Scraper  ScraperConfig  `mapstructure:"scraper"`
	Logging  LoggingConfig  `mapstructure:"logging"`
}

type ServerConfig struct {
	Environment  string        `mapstructure:"environment"`
	Port         int           `mapstructure:"port"`
	Host         string        `mapstructure:"host"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
	IdleTimeout  time.Duration `mapstructure:"idle_timeout"`
	MaxBodySize  int64         `mapstructure:"max_body_size"`
	RateLimit    int           `mapstructure:"rate_limit"` // requests per minute
}

type MongoDBConfig struct {
	URI            string        `mapstructure:"uri" validate:"required"`
	Database       string        `mapstructure:"database" validate:"required"`
	Username       string        `mapstructure:"username"`
	Password       string        `mapstructure:"password"`
	ConnectTimeout time.Duration `mapstructure:"connect_timeout"`
	AuthSource     string        `mapstructure:"auth_source"`
	MaxPoolSize    int           `mapstructure:"max_pool_size"`
	MinPoolSize    int           `mapstructure:"min_pool_size"`
}

type Neo4jConfig struct {
	URI      string `mapstructure:"uri"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	Database string `mapstructure:"database"`
}

type WeaviateConfig struct {
	Host      string            `mapstructure:"host"`
	Scheme    string            `mapstructure:"scheme"`
	Headers   map[string]string `mapstructure:"headers"`
	APIKey    string            `mapstructure:"api_key"`
	ClassName string            `mapstructure:"class_name"`
}

type LLMConfig struct {
	Provider    string            `mapstructure:"provider"`
	APIKey      string            `mapstructure:"api_key"`
	Model       string            `mapstructure:"model"`
	BaseURL     string            `mapstructure:"base_url"`
	MaxTokens   int               `mapstructure:"max_tokens"`
	Temperature float64           `mapstructure:"temperature"`
	Headers     map[string]string `mapstructure:"headers"`
}

type ScraperConfig struct {
	MaxConcurrent int    `mapstructure:"max_concurrent"`
	RateLimit     int    `mapstructure:"rate_limit"` // seconds between requests
	UserAgent     string `mapstructure:"user_agent"`
	Timeout       int    `mapstructure:"timeout"` // seconds
}

type LoggingConfig struct {
	Level      string `mapstructure:"level"`
	Format     string `mapstructure:"format"` // json or console
	OutputPath string `mapstructure:"output_path"`
}

// buildMongoDBURI constructs MongoDB connection string with authentication
func buildMongoDBURI() string {
	host := getEnvString("MONGODB_HOST", "localhost")
	port := getEnvString("MONGODB_PORT", "27017")
	username := getEnvString("MONGODB_USERNAME", "admin")
	password := getEnvString("MONGODB_PASSWORD", "password123")
	authSource := getEnvString("MONGODB_AUTH_SOURCE", "admin")

	// Check if we have custom URI
	if customURI := getEnvString("MONGODB_URI", ""); customURI != "" {
		return customURI
	}

	// Build URI with authentication
	if username != "" && password != "" {
		return fmt.Sprintf("mongodb://%s:%s@%s:%s/?authSource=%s",
			username, password, host, port, authSource)
	}

	// Fallback to non-authenticated connection
	return fmt.Sprintf("mongodb://%s:%s", host, port)
}

func LoadConfig() (*Config, error) {
	// Configuration loaded from environment variables

	config := &Config{
		Server: ServerConfig{
			Environment:  getEnvString("ENVIRONMENT", "development"),
			Port:         getEnvInt("PORT", 8080),
			Host:         getEnvString("HOST", "0.0.0.0"),
			ReadTimeout:  getEnvDuration("READ_TIMEOUT", "30s"),
			WriteTimeout: getEnvDuration("WRITE_TIMEOUT", "30s"),
			IdleTimeout:  getEnvDuration("IDLE_TIMEOUT", "120s"),
			MaxBodySize:  getEnvInt64("MAX_BODY_SIZE", 10*1024*1024), // 10MB
			RateLimit:    getEnvInt("RATE_LIMIT", 100),               // 100 requests per minute
		},
		MongoDB: MongoDBConfig{
			URI:            buildMongoDBURI(),
			Database:       getEnvString("MONGODB_DATABASE", "mathprereq"),
			Username:       getEnvString("MONGODB_USERNAME", "admin"),
			Password:       getEnvString("MONGODB_PASSWORD", "password123"),
			AuthSource:     getEnvString("MONGODB_AUTH_SOURCE", "admin"),
			ConnectTimeout: getEnvDuration("MONGODB_CONNECT_TIMEOUT", "10s"),
			MaxPoolSize:    getEnvInt("MONGODB_MAX_POOL_SIZE", 100),
			MinPoolSize:    getEnvInt("MONGODB_MIN_POOL_SIZE", 5),
		},
		Neo4j: Neo4jConfig{
			URI:      getEnvString("NEO4J_URI", "neo4j://localhost:7687"),
			Username: getEnvString("NEO4J_USERNAME", "neo4j"),
			Password: getEnvString("NEO4J_PASSWORD", "password123"),
			Database: getEnvString("NEO4J_DATABASE", "neo4j"),
		},
		Weaviate: WeaviateConfig{
			Host:      getEnvString("WEAVIATE_HOST", ""),
			Scheme:    getEnvString("WEAVIATE_SCHEME", ""),
			APIKey:    getEnvString("WEAVIATE_API_KEY", ""),
			ClassName: getEnvString("WEAVIATE_CLASS_NAME", ""),
			Headers:   make(map[string]string),
		},
		LLM: LLMConfig{
			Provider:    getEnvString("LLM_PROVIDER", "gemini"),
			APIKey:      getEnvString("LLM_API_KEY", ""),
			Model:       getEnvString("LLM_MODEL", ""),
			BaseURL:     getEnvString("LLM_BASE_URL", ""),
			MaxTokens:   getEnvInt("LLM_MAX_TOKENS", 2000),
			Temperature: getEnvFloat64("LLM_TEMPERATURE", 0.7),
			Headers:     make(map[string]string),
		},
		Scraper: ScraperConfig{
			MaxConcurrent: getEnvInt("SCRAPER_MAX_CONCURRENT", 5),
			RateLimit:     getEnvInt("SCRAPER_RATE_LIMIT", 2),
			UserAgent:     getEnvString("SCRAPER_USER_AGENT", "MathPrereq-Bot/1.0"),
			Timeout:       getEnvInt("SCRAPER_TIMEOUT", 30),
		},
		Logging: LoggingConfig{
			Level:      getEnvString("LOG_LEVEL", "info"),
			Format:     getEnvString("LOG_FORMAT", "json"),
			OutputPath: getEnvString("LOG_OUTPUT_PATH", "stdout"),
		},
	}

	if err := validateConfig(config); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return config, nil
}


func validateConfig(cfg *Config) error {
	if cfg.MongoDB.URI == "" {
		return fmt.Errorf("MONGODB_URI is required")
	}
	if cfg.Neo4j.URI == "" {
		return fmt.Errorf("NEO4J_URI is required")
	}
	if cfg.Weaviate.Host == "" {
		return fmt.Errorf("WEAVIATE_HOST is required")
	}
	if cfg.Server.Port <= 0 || cfg.Server.Port > 65535 {
		return fmt.Errorf("invalid server port: %d", cfg.Server.Port)
	}
	return nil
}

// Helper functions for environment variable parsing
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

func getEnvInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseInt(value, 10, 64); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvFloat64(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseFloat(value, 64); err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue string) time.Duration {
	value := getEnvString(key, defaultValue)
	if duration, err := time.ParseDuration(value); err == nil {
		return duration
	}
	// Fallback to default
	if duration, err := time.ParseDuration(defaultValue); err == nil {
		return duration
	}
	return 30 * time.Second
}
