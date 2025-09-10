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
	client   *mongo.Client
	database *mongo.Database
	config   Config
	logger   *zap.Logger
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

	// Create MongoDB client options
	clientOptions := options.Client().
		ApplyURI(config.URI).
		SetConnectTimeout(config.ConnectTimeout).
		SetServerSelectionTimeout(config.ConnectTimeout)

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), config.ConnectTimeout)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Test the connection
	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	logger.Info("Connected to MongoDB successfully",
		zap.String("database", config.Database),
		zap.Duration("connect_timeout", config.ConnectTimeout))

	return &Client{
		client:   client,
		database: client.Database(config.Database),
		logger:   logger,
	}, nil
}

// GetMongoClient returns the underlying MongoDB client
func (c *Client) GetMongoClient() *mongo.Client {
	return c.client
}

// GetDatabase returns the database instance
func (c *Client) GetDatabase() *mongo.Database {
	return c.database
}

// Close disconnects the MongoDB client
func (c *Client) Close(ctx context.Context) error {
	if c.client != nil {
		return c.client.Disconnect(ctx)
	}
	return nil
}

// GetCollection returns a collection instance
func (c *Client) GetCollection(name string) *mongo.Collection {
	return c.database.Collection(name)
}

// Ping tests the MongoDB connection
func (c *Client) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, c.config.QueryTimeout)
	defer cancel()

	return c.client.Ping(ctx, nil)
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
