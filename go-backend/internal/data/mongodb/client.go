package mongodb

import (
	"context"
	"fmt"
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
		ApplyURI(config.URI).
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
