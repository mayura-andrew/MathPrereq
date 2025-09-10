package mongodb

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"

	"github.com/mathprereq/pkg/logger"
)

// Config holds MongoDB configuration
type Config struct {
	URI            string        `yaml:"uri" env:"MONGODB_URI"`
	Database       string        `yaml:"database" env:"MONGODB_DATABASE"`
	Username       string        `yaml:"username" env:"MONGODB_USERNAME"`
	Password       string        `yaml:"password" env:"MONGODB_PASSWORD"`
	ConnectTimeout time.Duration `yaml:"connect_timeout"`
	QueryTimeout   time.Duration `yaml:"query_timeout"`
}

// Client wraps MongoDB client with additional functionality
type Client struct {
	config      Config
	mongoClient *mongo.Client
	database    *mongo.Database
	logger      *zap.Logger
}

// NewClient creates a new MongoDB client
func NewClient(config Config) (*Client, error) {
	logger := logger.MustGetLogger()

	// Set defaults
	if config.ConnectTimeout == 0 {
		config.ConnectTimeout = 10 * time.Second
	}
	if config.QueryTimeout == 0 {
		config.QueryTimeout = 30 * time.Second
	}
	if config.Database == "" {
		config.Database = "mathprereq"
	}

	// Create client options with authentication
	clientOptions := options.Client().
		ApplyURI(config.URI)

	// Add authentication if credentials are provided
	if config.Username != "" && config.Password != "" {
		credential := options.Credential{
			Username:   config.Username,
			Password:   config.Password,
			AuthSource: "admin", // Default auth source
		}
		clientOptions = clientOptions.SetAuth(credential)
		logger.Info("MongoDB authentication configured",
			zap.String("username", config.Username),
			zap.String("auth_source", "admin"))
	}

	clientOptions = clientOptions.
		SetConnectTimeout(config.ConnectTimeout).
		SetServerSelectionTimeout(config.ConnectTimeout).
		SetSocketTimeout(config.QueryTimeout).
		SetMaxPoolSize(10).
		SetMinPoolSize(2)

	logger.Info("Creating MongoDB client",
		zap.String("uri", config.URI),
		zap.String("database", config.Database),
		zap.Duration("connect_timeout", config.ConnectTimeout))

	// Connect to MongoDB
	mongoClient, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Test the connection
	testCtx, testCancel := context.WithTimeout(context.Background(), config.ConnectTimeout)
	defer testCancel()

	if err := mongoClient.Ping(testCtx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	database := mongoClient.Database(config.Database)

	client := &Client{
		config:      config,
		mongoClient: mongoClient,
		database:    database,
		logger:      logger,
	}

	logger.Info("MongoDB client created successfully",
		zap.String("database", config.Database))

	return client, nil
}

// Test MongoDB connection with write permissions for query analytics
func testMongoWritePermissions(ctx context.Context, client *mongo.Client, database string, logger *zap.Logger) error {
	testCollection := client.Database(database).Collection("connection_test")
	testDoc := bson.M{
		"test":      true,
		"timestamp": time.Now(),
		"purpose":   "auth_test",
	}

	logger.Info("Testing MongoDB write operation for query analytics...")

	// Test insert
	result, err := testCollection.InsertOne(ctx, testDoc)
	if err != nil {
		logger.Error("MongoDB write test failed", zap.Error(err))
		return fmt.Errorf("MongoDB write test failed (authentication issue?): %w", err)
	}

	logger.Info("MongoDB write test successful", zap.String("inserted_id", fmt.Sprintf("%v", result.InsertedID)))

	// Clean up test document
	_, cleanupErr := testCollection.DeleteOne(ctx, bson.M{"test": true, "purpose": "auth_test"})
	if cleanupErr != nil {
		logger.Warn("Failed to cleanup test document", zap.Error(cleanupErr))
	}

	return nil
}

// Enhanced MongoDB client creation with proper auth testing
func NewClientWithAuthTest(config Config) (*Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), config.ConnectTimeout)
	defer cancel()

	logger := logger.MustGetLogger()

	// Create client options with authentication
	clientOptions := options.Client().
		ApplyURI(config.URI)

	// Add authentication if credentials are provided
	if config.Username != "" && config.Password != "" {
		credential := options.Credential{
			Username:   config.Username,
			Password:   config.Password,
			AuthSource: "admin", // Default auth source
		}
		clientOptions = clientOptions.SetAuth(credential)
		logger.Info("MongoDB authentication configured",
			zap.String("username", config.Username),
			zap.String("auth_source", "admin"))
	}

	clientOptions = clientOptions.
		SetConnectTimeout(config.ConnectTimeout).
		SetServerSelectionTimeout(config.ConnectTimeout).
		SetSocketTimeout(config.QueryTimeout).
		SetMaxPoolSize(10).
		SetMinPoolSize(2)

	// Create MongoDB client
	logger.Info("Creating MongoDB client",
		zap.String("uri", maskConnectionString(config.URI)),
		zap.String("database", config.Database),
		zap.Duration("connect_timeout", config.ConnectTimeout))

	mongoClient, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to create MongoDB client: %w", err)
	}

	// Test basic connection
	if err := mongoClient.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	// Test write permissions (critical for query analytics)
	if err := testMongoWritePermissions(ctx, mongoClient, config.Database, logger); err != nil {
		return nil, fmt.Errorf("MongoDB write permissions test failed: %w", err)
	}

	logger.Info("MongoDB client created successfully with write permissions verified",
		zap.String("database", config.Database))

	return &Client{
		config:      config,
		mongoClient: mongoClient,
		database:    mongoClient.Database(config.Database),
		logger:      logger,
	}, nil
}

// maskConnectionString masks sensitive information in connection strings for logging
func maskConnectionString(uri string) string {
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

// GetMongoClient returns the underlying MongoDB client
func (c *Client) GetMongoClient() *mongo.Client {
	return c.mongoClient
}

// GetDatabase returns the MongoDB database
func (c *Client) GetDatabase() *mongo.Database {
	return c.database
}

// Close disconnects the MongoDB client
func (c *Client) Close(ctx context.Context) error {
	if c.mongoClient != nil {
		return c.mongoClient.Disconnect(ctx)
	}
	return nil
}

// GetCollection returns a collection instance
func (c *Client) GetCollection(name string) *mongo.Collection {
	return c.database.Collection(name)
}

// Ping tests the MongoDB connection
func (c *Client) Ping(ctx context.Context) error {
	return c.mongoClient.Ping(ctx, nil)
}

// GetStats returns MongoDB statistics
func (c *Client) GetStats(ctx context.Context) (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(ctx, c.config.QueryTimeout)
	defer cancel()

	// Get database stats
	var result bson.M
	err := c.database.RunCommand(ctx, bson.D{{"dbStats", 1}}).Decode(&result)
	if err != nil {
		return nil, fmt.Errorf("failed to get database stats: %w", err)
	}

	stats := map[string]interface{}{
		"status":       "healthy",
		"database":     c.config.Database,
		"collections":  result["collections"],
		"data_size":    result["dataSize"],
		"storage_size": result["storageSize"],
		"indexes":      result["indexes"],
		"index_size":   result["indexSize"],
	}

	return stats, nil
}

// GetRawClient returns the underlying MongoDB client
func (c *Client) GetRawClient() *mongo.Client {
	return c.mongoClient
}

// TestConnection tests the MongoDB connection with authentication
func (c *Client) TestConnection(ctx context.Context) error {
	if c.mongoClient == nil {
		return fmt.Errorf("MongoDB client is not initialized")
	}

	// Test ping
	if err := c.mongoClient.Ping(ctx, nil); err != nil {
		return fmt.Errorf("ping failed: %w", err)
	}

	// Test write access
	testCollection := c.database.Collection("connection_test")
	testDoc := bson.M{
		"test":      "auth_verification",
		"timestamp": time.Now(),
	}

	result, err := testCollection.InsertOne(ctx, testDoc)
	if err != nil {
		return fmt.Errorf("write test failed: %w", err)
	}

	// Clean up
	_, _ = testCollection.DeleteOne(ctx, bson.M{"_id": result.InsertedID})

	c.logger.Info("MongoDB connection test successful")
	return nil
}
