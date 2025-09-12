package weaviate

import (
	"context"
	"fmt"

	"github.com/go-openapi/strfmt"
	"github.com/google/uuid"
	"github.com/weaviate/weaviate-go-client/v4/weaviate"
	"github.com/weaviate/weaviate-go-client/v4/weaviate/auth"
	"github.com/weaviate/weaviate-go-client/v4/weaviate/graphql"
	"github.com/weaviate/weaviate/entities/models"

	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/pkg/logger"
	"go.uber.org/zap"
)

type Client struct {
	client *weaviate.Client
	logger *zap.Logger
	class  string
}

type Source struct {
	URL      string `json:"url,omitempty"`
	Title    string `json:"title,omitempty"`
	Author   string `json:"author,omitempty"`
	Document string `json:"document,omitempty"`
	Page     int    `json:"page,omitempty"`
}

type ContentChunk struct {
	ID         string `json:"id"`
	Content    string `json:"content"`
	Concept    string `json:"concept"`
	Chapter    string `json:"chapter"`
	Source     Source `json:"source"`
	ChunkIndex int    `json:"chunk_index"`
}

type SearchResult struct {
	Content  string                 `json:"content"`
	Concept  string                 `json:"concept"`
	Chapter  string                 `json:"chapter"`
	Score    float32                `json:"score"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

func NewClient(cfg config.WeaviateConfig) (*Client, error) {
	logger := logger.MustGetLogger()

	// Use API key from config, not hardcoded
	var authConfig auth.Config
	if cfg.APIKey != "" {
		authConfig = auth.ApiKey{Value: cfg.APIKey}
	}

	// Configure Weaviate client
	weaviateConfig := weaviate.Config{
		Host:       cfg.Host,
		Scheme:     cfg.Scheme,
		AuthConfig: authConfig,
		Headers:    cfg.Headers,
	}

	weaviateClient, err := weaviate.NewClient(weaviateConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Weaviate client: %w", err)
	}

	// Use ClassName from config, with fallback
	className := cfg.ClassName
	if className == "" {
		className = "MathChunk" // Default fallback
	}

	client := &Client{
		client: weaviateClient,
		logger: logger,
		class:  className,
	}

	// Test connection
	if !client.IsHealthy(context.Background()) {
		return nil, fmt.Errorf("weaviate is not healthy at %s://%s", cfg.Scheme, cfg.Host)
	}

	// Initialize schema
	if err := client.initSchema(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	logger.Info("Weaviate client initialized successfully",
		zap.String("host", cfg.Host),
		zap.String("class", className))

	return client, nil
}

func (c *Client) initSchema(ctx context.Context) error {
	// Check if class already exists
	exists, err := c.client.Schema().ClassExistenceChecker().WithClassName(c.class).Do(ctx)
	if err != nil {
		return fmt.Errorf("failed to check class existence: %w", err)
	}

	if exists {
		c.logger.Info("Schema class already exists", zap.String("class", c.class))
		return nil
	}

	// Create class schema
	classObj := &models.Class{
		Class:      c.class,
		Vectorizer: "text2vec-openai", 
		Properties: []*models.Property{
			{
				DataType:    []string{"text"},
				Name:        "content",
				Description: "The text content of the chunk",
			},
			{
				DataType:    []string{"string"},
				Name:        "concept",
				Description: "The mathematical concept this chunk relates to",
			},
			{
				DataType:    []string{"string"},
				Name:        "chapter",
				Description: "The chapter or section this chunk comes from",
			},
			{
				DataType:    []string{"string"},
				Name:        "source",
				Description: "The source document or material",
			},
			{
				DataType:    []string{"int"},
				Name:        "chunkIndex",
				Description: "The index of this chunk within the source",
			},
		},
	}

	err = c.client.Schema().ClassCreator().WithClass(classObj).Do(ctx)
	if err != nil {
		return fmt.Errorf("failed to create class: %w", err)
	}

	c.logger.Info("Created schema class", zap.String("class", c.class))
	return nil
}

func (c *Client) SemanticSearch(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	c.logger.Info("Performing semantic search",
		zap.String("query", query),
		zap.Int("limit", limit))

	// Build the nearText argument
	nearText := c.client.GraphQL().NearTextArgBuilder().
		WithConcepts([]string{query})

	// Build fields using the proper field builders
	fields := []graphql.Field{
		{Name: "content"},
		{Name: "concept"},
		{Name: "chapter"},
		{
			Name: "_additional",
			Fields: []graphql.Field{
				{Name: "certainty"},
			},
		},
	}

	// Build the GraphQL query
	result, err := c.client.GraphQL().Get().
		WithClassName(c.class).
		WithFields(fields...).
		WithNearText(nearText).
		WithLimit(limit).
		Do(ctx)

	if err != nil {
		return nil, fmt.Errorf("semantic search failed: %w", err)
	}

	// Parse results
	var searchResults []SearchResult

	if result.Data != nil {
		if get, ok := result.Data["Get"].(map[string]interface{}); ok {
			if classData, ok := get[c.class].([]interface{}); ok {
				for _, item := range classData {
					if obj, ok := item.(map[string]interface{}); ok {
						searchResult := SearchResult{
							Content: getStringField(obj, "content"),
							Concept: getStringField(obj, "concept"),
							Chapter: getStringField(obj, "chapter"),
						}

						// Extract certainty score from _additional
						if additional, ok := obj["_additional"].(map[string]interface{}); ok {
							if certainty, ok := additional["certainty"].(float64); ok {
								searchResult.Score = float32(certainty)
							}
						}

						searchResults = append(searchResults, searchResult)
					}
				}
			}
		}
	}

	c.logger.Info("Semantic search completed",
		zap.Int("results", len(searchResults)))

	return searchResults, nil
}

func (c *Client) AddContent(ctx context.Context, content []ContentChunk) error {
	c.logger.Info("Adding content to vector store",
		zap.Int("chunks", len(content)))

	if len(content) == 0 {
		c.logger.Warn("No content to add")
		return nil
	}

	// Batch insert for better performance
	batcher := c.client.Batch().ObjectsBatcher()

	for _, chunk := range content {
		// Convert Source struct to string for Weaviate storage
		sourceStr := chunk.Source.Document
		if sourceStr == "" {
			sourceStr = chunk.Source.Title
		}
		if sourceStr == "" {
			sourceStr = "unknown"
		}

		properties := map[string]interface{}{
			"content":    chunk.Content,
			"concept":    chunk.Concept,
			"chapter":    chunk.Chapter,
			"source":     sourceStr, // Convert Source to string
			"chunkIndex": chunk.ChunkIndex,
		}

		// Generate a proper UUID for the chunk
		uuidValue := uuid.New().String()

		obj := &models.Object{
			Class:      c.class,
			ID:         strfmt.UUID(uuidValue),
			Properties: properties,
		}

		batcher = batcher.WithObjects(obj)
	}

	// Execute batch
	batchResult, err := batcher.Do(ctx)
	if err != nil {
		return fmt.Errorf("batch insert failed: %w", err)
	}

	// Check for errors in batch result
	if batchResult != nil {
		errorCount := 0
		for i, result := range batchResult {
			if result.Result.Errors != nil && len(result.Result.Errors.Error) > 0 {
				errorCount++
				c.logger.Warn("Error adding content chunk",
					zap.Int("chunk_index", i),
					zap.Any("errors", result.Result.Errors.Error))
			}
		}

		if errorCount > 0 {
			c.logger.Warn("Some content chunks failed to insert",
				zap.Int("total_chunks", len(content)),
				zap.Int("failed_chunks", errorCount))
		}
	}

	c.logger.Info("Successfully added content to vector store",
		zap.Int("total_chunks", len(content)))
	return nil
}

func (c *Client) IsHealthy(ctx context.Context) bool {
	// Check if we can connect to Weaviate
	result, err := c.client.Misc().LiveChecker().Do(ctx)
	if err != nil {
		c.logger.Warn("Weaviate health check failed", zap.Error(err))
		return false
	}

	return result
}

func (c *Client) GetStats(ctx context.Context) (map[string]interface{}, error) {
	// Get object count for the class
	result, err := c.client.GraphQL().Aggregate().
		WithClassName(c.class).
		WithFields(graphql.Field{
			Name: "meta",
			Fields: []graphql.Field{
				{Name: "count"},
			},
		}).
		Do(ctx)

	if err != nil {
		c.logger.Warn("Failed to get Weaviate stats", zap.Error(err))
		return map[string]interface{}{
			"total_chunks": int64(0),
			"status":       "unhealthy",
			"error":        err.Error(),
		}, err
	}

	totalChunks := int64(0)
	if result.Data != nil {
		if aggregate, ok := result.Data["Aggregate"].(map[string]interface{}); ok {
			if classData, ok := aggregate[c.class]; ok {
				if objects, ok := classData.([]interface{}); ok && len(objects) > 0 {
					if objMap, ok := objects[0].(map[string]interface{}); ok {
						if meta, exists := objMap["meta"]; exists {
							if metaMap, ok := meta.(map[string]interface{}); ok {
								if count, exists := metaMap["count"]; exists {
									if countFloat, ok := count.(float64); ok {
										totalChunks = int64(countFloat)
									}
								}
							}
						}
					}
				}
			}
		}
	}

	return map[string]interface{}{
		"total_chunks": totalChunks,
		"status":       "healthy",
		"class":        c.class,
	}, nil
}

func (c *Client) DeleteAll(ctx context.Context) error {
	c.logger.Info("Deleting all content from vector store")

	// Delete the entire class
	err := c.client.Schema().ClassDeleter().WithClassName(c.class).Do(ctx)
	if err != nil {
		c.logger.Error("Failed to delete class", zap.Error(err))
		return fmt.Errorf("failed to delete class: %w", err)
	}

	// Recreate the schema
	if err := c.initSchema(ctx); err != nil {
		return fmt.Errorf("failed to recreate schema: %w", err)
	}

	c.logger.Info("Successfully deleted all content and recreated schema")
	return nil
}

// Search method to match repository interface expectations
func (c *Client) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	return c.SemanticSearch(ctx, query, limit)
}

// Close method for graceful shutdown
func (c *Client) Close() error {
	// Weaviate client doesn't require explicit closing
	c.logger.Info("Weaviate client closed")
	return nil
}

// Helper function to safely extract string fields
func getStringField(obj map[string]interface{}, field string) string {
	if value, ok := obj[field].(string); ok {
		return value
	}
	return ""
}
