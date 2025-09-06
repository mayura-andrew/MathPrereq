package weaviate

import (
	"context"
	"fmt"

	"github.com/go-openapi/strfmt"
	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/pkg/logger"
	"github.com/weaviate/weaviate-go-client/v4/weaviate"
	"github.com/weaviate/weaviate-go-client/v4/weaviate/graphql"
	"github.com/weaviate/weaviate/entities/models"
	"go.uber.org/zap"
)

type Client struct {
	client *weaviate.Client
	logger *zap.Logger
	class  string
}

type SearchResult struct {
	Content string  `json:"content"`
	Concept string  `json:"concept,omitempty"`
	Chapter string  `json:"chapter,omitempty"`
	Score   float32 `json:"score,omitempty"`
}

type ContentChunk struct {
	ID         string `json:"id"`
	Content    string `json:"content"`
	Concept    string `json:"concept"`
	Chapter    string `json:"chapter"`
	Source     string `json:"source"`
	ChunkIndex int    `json:"chunk_index"`
}

func NewClient(cfg config.WeaviateConfig) (*Client, error) {
	logger := logger.MustGetLogger()

	client, err := weaviate.NewClient(weaviate.Config{
		Host:   cfg.Host,
		Scheme: cfg.Scheme,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Weaviate client: %w", err)
	}

	// Test connection
	ctx := context.Background()
	ready, err := client.Misc().ReadyChecker().Do(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to check Weaviate readiness: %w", err)
	}

	if !ready {
		return nil, fmt.Errorf("Weaviate is not ready")
	}

	weaviateClient := &Client{
		client: client,
		logger: logger,
		class:  cfg.Class,
	}

	if err := weaviateClient.ensureSchema(ctx); err != nil {
		return nil, fmt.Errorf("failed to ensure schema: %w", err)
	}

	logger.Info("Connected to Weaviate", zap.String("host", cfg.Host))

	return weaviateClient, nil
}

func (c *Client) ensureSchema(ctx context.Context) error {
	// Check if class exists
	exists, err := c.client.Schema().ClassExistenceChecker().WithClassName(c.class).Do(ctx)
	if err != nil {
		return fmt.Errorf("failed to check class existence: %w", err)
	}

	if exists {
		c.logger.Info("Schema already exists", zap.String("class", c.class))
		return nil
	}

	// Create class schema with Google vectorizer configuration
	schema := &models.Class{
		Class:       c.class,
		Description: "Calculus textbook content for semantic search",
		Vectorizer:  "text2vec-google",
		ModuleConfig: map[string]interface{}{
			"text2vec-google": map[string]interface{}{
				"model":              "text-embedding-004",
				"projectId":          "mathprereq",
				"dimensions":         768,
				"vectorizeClassName": false,
			},
			"generative-google": map[string]interface{}{
				"model":     "gemini-2.5-pro",
				"projectId": "mathprereq",
			},
		},
		Properties: []*models.Property{
			{
				Name:        "content",
				Description: "Text content of the chunk",
				DataType:    []string{"text"},
				ModuleConfig: map[string]interface{}{
					"text2vec-google": map[string]interface{}{
						"skip": false,
					},
				},
			},
			{
				Name:        "concept",
				Description: "Mathematical concept covered",
				DataType:    []string{"string"},
				ModuleConfig: map[string]interface{}{
					"text2vec-google": map[string]interface{}{
						"skip": true,
					},
				},
			},
			{
				Name:        "chapter",
				Description: "Chapter or section name",
				DataType:    []string{"string"},
				ModuleConfig: map[string]interface{}{
					"text2vec-google": map[string]interface{}{
						"skip": true,
					},
				},
			},
			{
				Name:        "source",
				Description: "Source document",
				DataType:    []string{"string"},
				ModuleConfig: map[string]interface{}{
					"text2vec-google": map[string]interface{}{
						"skip": true,
					},
				},
			},
			{
				Name:        "chunk_index",
				Description: "Index of the chunk in the document",
				DataType:    []string{"int"},
			},
		},
	}

	if err := c.client.Schema().ClassCreator().WithClass(schema).Do(ctx); err != nil {
		return fmt.Errorf("failed to create schema: %w", err)
	}

	c.logger.Info("Created schema with Google vectorizer", zap.String("class", c.class))
	return nil
}

func (c *Client) SemanticSearch(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	if limit <= 0 {
		limit = 3
	}

	result, err := c.client.GraphQL().Get().WithClassName(c.class).WithFields(
		graphql.Field{Name: "content"},
		graphql.Field{Name: "concept"},
		graphql.Field{Name: "chapter"},
		graphql.Field{Name: "_additional", Fields: []graphql.Field{
			{Name: "certainty"},
		}},
	).
		WithNearText(c.client.GraphQL().NearTextArgBuilder().
			WithConcepts([]string{query})).WithLimit(limit).Do(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to perform semantic search: %w", err)
	}

	var searchResults []SearchResult

	if result.Data["Get"] != nil {
		classData := result.Data["Get"].(map[string]interface{})[c.class]
		if classData != nil {
			for _, item := range classData.([]interface{}) {
				obj := item.(map[string]interface{})

				searchResult := SearchResult{
					Content: obj["content"].(string),
				}

				if concept, ok := obj["concept"]; ok && concept != nil {
					searchResult.Concept = concept.(string)
				}

				if chapter, ok := obj["chapter"]; ok && chapter != nil {
					searchResult.Chapter = chapter.(string)
				}

				if additional, ok := obj["_additional"]; ok {
					if certainty, ok := additional.(map[string]interface{})["certainty"]; ok {
						searchResult.Score = float32(certainty.(float64))
					}
				}

				searchResults = append(searchResults, searchResult)
			}
		}
	}

	c.logger.Info("Semantic search completed",
		zap.String("query", query),
		zap.Int("results", len(searchResults)))

	return searchResults, nil
}

func (c *Client) AddContent(ctx context.Context, content []ContentChunk) error {
	if len(content) == 0 {
		return nil
	}

	batcher := c.client.Batch().ObjectsBatcher()

	for i, chunk := range content {
		obj := &models.Object{
			Class: c.class,
			ID:    strfmt.UUID(chunk.ID),
			Properties: map[string]interface{}{
				"content":     chunk.Content,
				"concept":     chunk.Concept,
				"chapter":     chunk.Chapter,
				"source":      chunk.Source,
				"chunk_index": chunk.ChunkIndex,
			},
		}

		batcher = batcher.WithObject(obj)

		// Batch in groups of 100
		if (i+1)%100 == 0 || i == len(content)-1 {
			if _, err := batcher.Do(ctx); err != nil {
				return fmt.Errorf("failed to batch upload objects: %w", err)
			}
			batcher = c.client.Batch().ObjectsBatcher()
		}
	}

	c.logger.Info("Added content to vector store", zap.Int("chunks", len(content)))
	return nil
}

func (c *Client) IsHealthy(ctx context.Context) bool {
	ready, err := c.client.Misc().ReadyChecker().Do(ctx)
	return err == nil && ready
}

func (c *Client) GetStats(ctx context.Context) (map[string]interface{}, error) {
	result, err := c.client.GraphQL().Aggregate().
		WithClassName(c.class).
		WithFields(graphql.Field{Name: "meta", Fields: []graphql.Field{
			{Name: "count"},
		}}).
		Do(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to get stats: %w", err)
	}

	stats := map[string]interface{}{
		"total_chunks": 0,
	}

	if result.Data["Aggregate"] != nil {
		classData := result.Data["Aggregate"].(map[string]interface{})[c.class]
		if classData != nil {
			for _, item := range classData.([]interface{}) {
				obj := item.(map[string]interface{})
				if meta, ok := obj["meta"]; ok {
					if count, ok := meta.(map[string]interface{})["count"]; ok {
						stats["total_chunks"] = int(count.(float64))
					}
				}
			}
		}
	}

	return stats, nil
}

// Add this method to your Client struct for Google-powered generative search
// func (c *Client) GenerativeSearch(ctx context.Context, query string, limit int) ([]SearchResult, error) {
// 	if limit <= 0 {
// 		limit = 3
// 	}

// 	result, err := c.client.GraphQL().Get().WithClassName(c.class).WithFields(
// 		graphql.Field{Name: "content"},
// 		graphql.Field{Name: "concept"},
// 		graphql.Field{Name: "chapter"},
// 		graphql.Field{Name: "_additional", Fields: []graphql.Field{
// 			{Name: "certainty"},
// 			{Name: "generate", Fields: []graphql.Field{
// 				{Name: "singleResult"},
// 				{Name: "error"},
// 			}},
// 		}},
// 	).
// 		WithNearText(c.client.GraphQL().NearTextArgBuilder().
// 			WithConcepts([]string{query})).
// 		WithGenerate(&graphql.GenerateBuilder{
// 			SinglePrompt: "Explain this mathematical concept in simple terms: {content}",
// 		}).
// 		WithLimit(limit).Do(ctx)

// 	if err != nil {
// 		return nil, fmt.Errorf("failed to perform generative search: %w", err)
// 	}

// 	var searchResults []SearchResult

// 	if result.Data["Get"] != nil {
// 		classData := result.Data["Get"].(map[string]interface{})[c.class]
// 		if classData != nil {
// 			for _, item := range classData.([]interface{}) {
// 				obj := item.(map[string]interface{})

// 				searchResult := SearchResult{
// 					Content: obj["content"].(string),
// 				}

// 				if concept, ok := obj["concept"]; ok && concept != nil {
// 					searchResult.Concept = concept.(string)
// 				}

// 				if chapter, ok := obj["chapter"]; ok && chapter != nil {
// 					searchResult.Chapter = chapter.(string)
// 				}

// 				if additional, ok := obj["_additional"]; ok {
// 					addMap := additional.(map[string]interface{})

// 					if certainty, ok := addMap["certainty"]; ok {
// 						searchResult.Score = float32(certainty.(float64))
// 					}

// 					// Add generated explanation if available
// 					if generate, ok := addMap["generate"]; ok {
// 						if genMap, ok := generate.(map[string]interface{}); ok {
// 							if singleResult, ok := genMap["singleResult"]; ok && singleResult != nil {
// 								// You could add this to your SearchResult struct
// 								c.logger.Debug("Generated explanation", zap.String("explanation", singleResult.(string)))
// 							}
// 						}
// 					}
// 				}

// 				searchResults = append(searchResults, searchResult)
// 			}
// 		}
// 	}

// 	c.logger.Info("Generative search completed",
// 		zap.String("query", query),
// 		zap.Int("results", len(searchResults)))

// 	return searchResults, nil
// }
