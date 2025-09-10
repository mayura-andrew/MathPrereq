package container

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/mathprereq/internal/application/services"
	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/internal/core/llm"
	"github.com/mathprereq/internal/data/mongodb"
	"github.com/mathprereq/internal/data/neo4j"
	"github.com/mathprereq/internal/data/scraper"
	"github.com/mathprereq/internal/data/weaviate"
	"github.com/mathprereq/internal/domain/repositories"
	domainServices "github.com/mathprereq/internal/domain/services"
	infrastructurerepos "github.com/mathprereq/internal/infrastructure/repositories"
	"github.com/mathprereq/pkg/logger"
	"go.mongodb.org/mongo-driver/mongo"
	"go.uber.org/zap"
)

type Container interface {
	// Service accessor
	QueryService() domainServices.QueryService

	// GetMongoClient returns the MongoDB wrapper client
	GetMongoClient() *mongodb.Client
	// GetRawMongoClient returns the raw MongoDB client for resource operations
	GetRawMongoClient() *mongo.Client

	// GetResourceScraper returns the web scraper for educational resources
	GetResourceScraper() *scraper.EducationalWebScraper

	// Health check for all services
	HealthCheck(ctx context.Context) map[string]bool

	// Graceful shutdown
	Shutdown(ctx context.Context) error
}

type AppContainer struct {
	config *config.Config
	logger *zap.Logger

	// Database clients
	mongoClient    *mongodb.Client
	neo4jClient    *neo4j.Client
	weaviateClient *weaviate.Client
	llmClient      *llm.Client

	// Web scraper
	resourceScraper *scraper.EducationalWebScraper

	// Repositories
	conceptRepo repositories.ConceptRepository
	queryRepo   repositories.QueryRepository
	vectorRepo  repositories.VectorRepository

	// Services
	queryService domainServices.QueryService
}

func NewContainer(cfg *config.Config) (Container, error) {
	logger := logger.MustGetLogger()

	container := &AppContainer{
		config: cfg,
		logger: logger,
	}

	if err := container.initializeClients(); err != nil {
		return nil, fmt.Errorf("failed to initialize clients: %w", err)
	}

	if err := container.initializeRepositories(); err != nil {
		return nil, fmt.Errorf("failed to initialize repositories: %w", err)
	}

	if err := container.initializeServices(); err != nil {
		return nil, fmt.Errorf("failed to initialize services: %w", err)
	}

	// Initialize web scraper after services
	if err := container.initializeScraper(); err != nil {
		return nil, fmt.Errorf("failed to initialize scraper: %w", err)
	}

	logger.Info("Dependency injection container initialized successfully")
	return container, nil
}

func (c *AppContainer) initializeClients() error {
	// Use the enhanced initialization method with auth testing
	return c.initializeClientsEnhanced()
}

// Enhanced container initialization with proper MongoDB auth testing
func (c *AppContainer) initializeClientsEnhanced() error {
	c.logger.Info("Initializing data clients with enhanced authentication")

	// Initialize MongoDB client with auth testing
	c.logger.Info("Initializing MongoDB client with authentication testing",
		zap.String("uri", maskMongoURI(c.config.MongoDB.URI)))

	mongoConfig := mongodb.Config{
		URI:            c.config.MongoDB.URI,
		Database:       c.config.MongoDB.Database,
		Username:       c.config.MongoDB.Username,
		Password:       c.config.MongoDB.Password,
		ConnectTimeout: c.config.MongoDB.ConnectTimeout,
		QueryTimeout:   30 * time.Second,
	}

	// Use the enhanced client that tests write permissions
	mongoClient, err := mongodb.NewClientWithAuthTest(mongoConfig)
	if err != nil {
		return fmt.Errorf("failed to initialize MongoDB client: %w", err)
	}
	c.mongoClient = mongoClient

	c.logger.Info("MongoDB client initialized successfully with verified write permissions")

	// Initialize Neo4j client
	c.logger.Info("Initializing Neo4j client", zap.String("uri", c.config.Neo4j.URI))
	neo4jClient, err := neo4j.NewClient(c.config.Neo4j)
	if err != nil {
		return fmt.Errorf("failed to initialize Neo4j client: %w", err)
	}
	c.neo4jClient = neo4jClient

	c.logger.Info("Neo4j client initialized successfully")

	// Initialize Weaviate client
	c.logger.Info("Initializing Weaviate client",
		zap.String("host", c.config.Weaviate.Host))

	weaviateClient, err := weaviate.NewClient(c.config.Weaviate)
	if err != nil {
		return fmt.Errorf("failed to create Weaviate client: %w", err)
	}
	c.weaviateClient = weaviateClient

	c.logger.Info("Weaviate client initialized successfully")

	// Initialize LLM client
	c.logger.Info("Initializing LLM client", zap.String("provider", c.config.LLM.Provider))

	llmClient, err := llm.NewClient(c.config.LLM)
	if err != nil {
		return fmt.Errorf("failed to initialize LLM client: %w", err)
	}
	c.llmClient = llmClient

	c.logger.Info("LLM client initialized successfully")

	c.logger.Info("All data clients initialized successfully with enhanced authentication")
	return nil
}

// maskMongoURI masks sensitive information in MongoDB URIs for logging
func maskMongoURI(uri string) string {
	if strings.Contains(uri, "@") {
		parts := strings.Split(uri, "@")
		if len(parts) >= 2 && strings.Contains(parts[0], ":") {
			userParts := strings.Split(parts[0], ":")
			if len(userParts) >= 3 {
				userParts[len(userParts)-1] = "***"
				parts[0] = strings.Join(userParts, ":")
			}
		}
		return strings.Join(parts, "@")
	}
	return uri
}

func (c *AppContainer) initializeRepositories() error {
	c.logger.Info("Initializing repositories")

	// Import the actual repository implementations
	var mongoRepo repositories.QueryRepository
    if c.mongoClient != nil {
        // Extract the raw mongo.Client from your wrapper
        rawMongoClient := c.mongoClient.GetMongoClient()
        if rawMongoClient != nil {
            // Use your database name from config
            databaseName := c.config.MongoDB.Database
            if databaseName == "" {
                databaseName = "mathprereq" // default database name
            }
            mongoRepo = infrastructurerepos.NewMongoQueryRepository(rawMongoClient, databaseName, c.logger)
		 } else {
            c.logger.Warn("Raw MongoDB client is nil, using nil repository")
        }
    } else {
        c.logger.Info("MongoDB client not initialized, using nil repository")
    }

	neo4jRepo := infrastructurerepos.NewNeo4jConceptRepository(c.neo4jClient, c.logger)
	
	weaviateRepo := infrastructurerepos.NewWeaviateVectorRepository(c.weaviateClient, c.logger)

	c.conceptRepo = neo4jRepo
	c.queryRepo = mongoRepo
	c.vectorRepo = weaviateRepo

	c.logger.Info("All repositories initialized successfully")
	return nil
}

func (c *AppContainer) initializeServices() error {
	c.logger.Info("Initializing services")

	// Create LLM adapter
	llmAdapter := services.NewLLMAdapter(c.llmClient)

	// Initialize query service with all dependencies (scraper will be added later)
	c.queryService = services.NewQueryService(
		c.conceptRepo,
		c.queryRepo,
		c.vectorRepo,
		llmAdapter,
		nil, // scraper will be set after initialization
		c.logger,
	)

	c.logger.Info("All services initialized successfully")
	return nil
}

// initializeScraper initializes the web scraper for educational resources
func (c *AppContainer) initializeScraper() error {
	c.logger.Info("Initializing resource scraper")

	// Get raw MongoDB client for scraper
	rawClient := c.GetRawMongoClient()
	if rawClient == nil {
		c.logger.Error("Cannot initialize scraper: raw MongoDB client not available")
		return fmt.Errorf("raw MongoDB client not available for scraper")
	}

	// Create scraper configuration
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

	// Initialize scraper with shared MongoDB client
	resourceScraper, err := scraper.New(scraperConfig, rawClient)
	if err != nil {
		return fmt.Errorf("failed to initialize resource scraper: %w", err)
	}

	c.resourceScraper = resourceScraper

	// Now update the query service with the scraper
	if err := c.updateQueryServiceWithScraper(); err != nil {
		return fmt.Errorf("failed to update query service with scraper: %w", err)
	}

	c.logger.Info("Resource scraper initialized successfully")
	return nil
}

// updateQueryServiceWithScraper adds the scraper to the existing query service
func (c *AppContainer) updateQueryServiceWithScraper() error {
	// Create LLM adapter
	llmAdapter := services.NewLLMAdapter(c.llmClient)

	// Recreate query service with the scraper
	c.queryService = services.NewQueryService(
		c.conceptRepo,
		c.queryRepo,
		c.vectorRepo,
		llmAdapter,
		c.resourceScraper,
		c.logger,
	)

	c.logger.Info("Query service updated with resource scraper")
	return nil
}

// Service accessors
func (c *AppContainer) QueryService() domainServices.QueryService {
	return c.queryService
}

// GetMongoClient returns the MongoDB wrapper client
func (c *AppContainer) GetMongoClient() *mongodb.Client {
	return c.mongoClient
}

// GetRawMongoClient returns the raw MongoDB client for resource operations
func (c *AppContainer) GetRawMongoClient() *mongo.Client {
	if c.mongoClient == nil {
		c.logger.Warn("MongoDB client is not initialized")
		return nil
	}

	// Test the connection and authentication
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := c.mongoClient.TestConnection(ctx); err != nil {
		c.logger.Error("MongoDB client authentication test failed", zap.Error(err))
		return nil
	}

	rawClient := c.mongoClient.GetRawClient()
	if rawClient == nil {
		c.logger.Warn("Raw MongoDB client is not available")
		return nil
	}

	c.logger.Debug("Raw MongoDB client authentication verified")
	return rawClient
}

// GetResourceScraper returns the web scraper for educational resources
func (c *AppContainer) GetResourceScraper() *scraper.EducationalWebScraper {
	return c.resourceScraper
}

// Health check for all components
func (c *AppContainer) HealthCheck(ctx context.Context) map[string]bool {
	health := make(map[string]bool)

	// Check database connections
	health["mongodb"] = c.mongoClient.Ping(ctx) == nil
	health["neo4j"] = c.neo4jClient.IsHealthy(ctx)
	health["weaviate"] = c.weaviateClient.IsHealthy(ctx)
	health["llm"] = c.llmClient.IsHealthy(ctx)

	// Check repositories
	health["concept_repository"] = c.conceptRepo.IsHealthy(ctx)
	health["query_repository"] = c.queryRepo.IsHealthy(ctx)
	health["vector_repository"] = c.vectorRepo.IsHealthy(ctx)

	return health
}

// Graceful shutdown
func (c *AppContainer) Shutdown(ctx context.Context) error {
	c.logger.Info("Starting graceful shutdown of container")

	var errs []error

	// Close database connections
	if c.mongoClient != nil {
		if err := c.mongoClient.Close(ctx); err != nil {
			errs = append(errs, fmt.Errorf("failed to close MongoDB client: %w", err))
		}
	}

	if c.neo4jClient != nil {
		if err := c.neo4jClient.Close(); err != nil {
			errs = append(errs, fmt.Errorf("failed to close Neo4j client: %w", err))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("shutdown errors: %v", errs)
	}

	c.logger.Info("Container shutdown completed successfully")
	return nil
}
