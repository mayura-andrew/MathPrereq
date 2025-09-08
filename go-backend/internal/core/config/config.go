package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Neo4j    Neo4jConfig    `mapstructure:"neo4j"`
	Weaviate WeaviateConfig `mapstructure:"weaviate"`
	LLM      LLMConfig      `mapstructure:"llm"`
	Logging  LoggingConfig  `mapstructure:"logging"`
}

type ServerConfig struct {
	Port           int      `mapstructure:"port"`
	Host           string   `mapstructure:"host"`
	AllowedOrigins []string `mapstructure:"allowed_origins"`
	ReadTimeout    int      `mapstructure:"read_timeout"`
	WriteTimeout   int      `mapstructure:"write_timeout"`
	MaxHeaderBytes int      `mapstructure:"max_header_bytes"`
}

type Neo4jConfig struct {
	URI      string `mapstructure:"uri"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	Database string `mapstructure:"database"`
}

type WeaviateConfig struct {
	Host   string `yaml:"host" env:"WEAVIATE_HOST"`
	Scheme string `yaml:"scheme" env:"WEAVIATE_SCHEME"`
	Class  string `yaml:"class" env:"WEAVIATE_CLASS"`
	APIKey string `yaml:"api_key,omitempty" env:"WEAVIATE_API_KEY"`
}

type LLMConfig struct {
	Provider      string  `yaml:"provider" env:"MLF_LLM_PROVIDER" env-default:"gemini"`
	Model         string  `yaml:"model" env:"MLF_LLM_MODEL" env-default:"gemini-2.0-flash-exp"`
	APIKey        string  `yaml:"api_key" env:"MLF_LLM_API_KEY"`
	MaxTokens     int     `yaml:"max_tokens" env:"MLF_LLM_MAX_TOKENS" env-default:"8192"`
	Temperature   float32 `yaml:"temperature" env:"MLF_LLM_TEMPERATURE" env-default:"0.3"`
	RetryAttempts int     `yaml:"retry_attempts" env:"MLF_LLM_RETRY_ATTEMPTS" env-default:"3"`
}

type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

func Load() (*Config, error) {
	cfg := &Config{}

	// Load from file first
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")

	if err := viper.ReadInConfig(); err != nil {
		// Config file is optional
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
	} else {
		fmt.Printf("Using config file: %s\n", viper.ConfigFileUsed())
	}

	// Enable environment variable support
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Set defaults
	setDefaults()

	if err := viper.Unmarshal(cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return cfg, nil
}

func setDefaults() {
	// Server defaults
	viper.SetDefault("server.port", 8000)
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.read_timeout", 30)
	viper.SetDefault("server.write_timeout", 30)
	viper.SetDefault("server.max_header_bytes", 1048576)

	// Neo4j defaults
	viper.SetDefault("neo4j.uri", "bolt://localhost:7687")
	viper.SetDefault("neo4j.username", "neo4j")
	viper.SetDefault("neo4j.password", "password123")
	viper.SetDefault("neo4j.database", "neo4j")

	// Weaviate defaults
	viper.SetDefault("weaviate.host", "localhost:8080")
	viper.SetDefault("weaviate.scheme", "http")
	viper.SetDefault("weaviate.class", "CalculusContent")
	viper.SetDefault("weaviate.project_id", "mathprereq")

	// LLM defaults
	viper.SetDefault("llm.provider", "gemini")
	viper.SetDefault("llm.model", "gemini-2.5-pro")
	viper.SetDefault("llm.max_tokens", 2048)
	viper.SetDefault("llm.retry_attempts", 3)

	// Logging defaults
	viper.SetDefault("logging.level", "info")
	viper.SetDefault("logging.format", "json")
}

func validateConfig(config *Config) error {
	// Validate required fields
	if config.Neo4j.URI == "" {
		return fmt.Errorf("Neo4j URI is required")
	}

	if config.LLM.APIKey == "" {
		fmt.Println("Warning: LLM API key is not set")
	}

	return nil
}
