package config

import "github.com/spf13/viper"

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
	Host   string `mapstructure:"host"`
	Scheme string `mapstructure:"scheme"`
	Class  string `mapstructure:"class"`
	ProjectID string `env:"GOOGLE_PROJECT_ID"`

}

type LLMConfig struct {
    Provider      string `env:"MLF_LLM_PROVIDER" envDefault:"gemini"`
    APIKey        string `env:"MLF_LLM_API_KEY"`
    Model         string `env:"MLF_LLM_MODEL" envDefault:"gemini-2.5-flash"`
    MaxTokens     int    `env:"MLF_LLM_MAX_TOKENS" envDefault:"2048"`
    RetryAttempts int    `env:"MLF_LLM_RETRY_ATTEMPTS" envDefault:"3"`
}

type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	// Environment variables
	viper.AutomaticEnv()
	viper.SetEnvPrefix("MLF")

	// set defaultes
	setDefaults()

	if err := viper.ReadInConfig(); err != nil {
		return nil, err
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}
	return &config, nil
}

func setDefaults() {
	viper.SetDefault("server.port", 8000)
	viper.SetDefault("server.host", "localhost")
	viper.SetDefault("server.read_timeout", 30)
	viper.SetDefault("server.write_timeout", 30)
	viper.SetDefault("server.max_header_bytes", 1048576)

	viper.SetDefault("neo4j.uri", "bolt://localhost:7687")
	viper.SetDefault("neo4j.username", "neo4j")
	viper.SetDefault("neo4j.password", "password")
	viper.SetDefault("neo4j.database", "neo4j")

	viper.SetDefault("weaviate.host", "localhost:8080")
	viper.SetDefault("weaviate.scheme", "http")
	viper.SetDefault("weaviate.class", "CalculusContent")

	viper.SetDefault("llm.provider", "openai")
	viper.SetDefault("llm.model", "gpt-4o-mini")
	viper.SetDefault("llm.temperature", 0.1)
	viper.SetDefault("llm.max_tokens", 2000)
	viper.SetDefault("llm.retry_attempts", 3)

	viper.SetDefault("logging.level", "info")
	viper.SetDefault("logging.format", "json")
}
