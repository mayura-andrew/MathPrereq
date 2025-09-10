package repositories

import (
	"context"
	"fmt"

	"github.com/mathprereq/internal/data/weaviate"
	"github.com/mathprereq/internal/domain/repositories"
	"github.com/mathprereq/internal/types"
	"go.uber.org/zap"
)

type weaviateVectorRepository struct {
	client *weaviate.Client
	logger *zap.Logger
}

func NewWeaviateVectorRepository(client *weaviate.Client, logger *zap.Logger) repositories.VectorRepository {
	return &weaviateVectorRepository{
		client: client,
		logger: logger,
	}
}

func (r *weaviateVectorRepository) Search(ctx context.Context, query string, limit int) ([]types.VectorResult, error) {
	results, err := r.client.Search(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("vector search failed: %w", err)
	}

	vectorResults := make([]types.VectorResult, len(results))
	for i, result := range results {
		vectorResults[i] = types.VectorResult{
			Content:  result.Content,
			Score:    float64(result.Score),
			Metadata: result.Metadata,
		}
	}

	return vectorResults, nil
}

func (r *weaviateVectorRepository) IsHealthy(ctx context.Context) bool {
	return r.client.IsHealthy(ctx)
}

func (r *weaviateVectorRepository) GetStats(ctx context.Context) (map[string]interface{}, error) {
	return r.client.GetStats(ctx)
}
