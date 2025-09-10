package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/mathprereq/internal/data/mongodb"
	"github.com/mathprereq/internal/domain/entities"
	"github.com/mathprereq/internal/domain/repositories"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
)

type mongoQueryRepository struct {
	client *mongodb.Client
	logger *zap.Logger
}

func NewMongoQueryRepository(client *mongodb.Client, logger *zap.Logger) repositories.QueryRepository {
	return &mongoQueryRepository{
		client: client,
		logger: logger,
	}
}

func (r *mongoQueryRepository) Save(ctx context.Context, query *entities.Query) error {
	collection := r.client.GetCollection("queries")
	_, err := collection.InsertOne(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to save query: %w", err)
	}
	return nil
}

func (r *mongoQueryRepository) FindByID(ctx context.Context, id string) (*entities.Query, error) {
	collection := r.client.GetCollection("queries")
	var query entities.Query
	err := collection.FindOne(ctx, bson.M{"_id": id}).Decode(&query)
	if err != nil {
		return nil, fmt.Errorf("failed to find query: %w", err)
	}
	return &query, nil
}

func (r *mongoQueryRepository) FindByUserID(ctx context.Context, userID string, limit int) ([]*entities.Query, error) {
	collection := r.client.GetCollection("queries")

	filter := bson.M{"user_id": userID}
	opts := options.Find().SetLimit(int64(limit)).SetSort(bson.M{"timestamp": -1})

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find queries by user ID: %w", err)
	}
	defer cursor.Close(ctx)

	var queries []*entities.Query
	for cursor.Next(ctx) {
		var query entities.Query
		if err := cursor.Decode(&query); err != nil {
			continue
		}
		queries = append(queries, &query)
	}

	return queries, nil
}

func (r *mongoQueryRepository) GetQueryStats(ctx context.Context) (*repositories.QueryStats, error) {
	collection := r.client.GetCollection("queries")

	pipeline := []bson.M{
		{
			"$group": bson.M{
				"_id":           nil,
				"total_queries": bson.M{"$sum": 1},
				"successful_queries": bson.M{
					"$sum": bson.M{"$cond": bson.M{"if": "$success", "then": 1, "else": 0}},
				},
				"avg_processing_time": bson.M{"$avg": "$processing_time_ms"},
			},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to get query stats: %w", err)
	}
	defer cursor.Close(ctx)

	var result struct {
		TotalQueries      int64   `bson:"total_queries"`
		SuccessfulQueries int64   `bson:"successful_queries"`
		AvgProcessingTime float64 `bson:"avg_processing_time"`
	}

	if cursor.Next(ctx) {
		if err := cursor.Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to decode query stats: %w", err)
		}
	}

	successRate := float64(0)
	if result.TotalQueries > 0 {
		successRate = float64(result.SuccessfulQueries) / float64(result.TotalQueries) * 100
	}

	return &repositories.QueryStats{
		TotalQueries:    result.TotalQueries,
		SuccessRate:     successRate,
		AvgResponseTime: result.AvgProcessingTime,
	}, nil
}

func (r *mongoQueryRepository) GetPopularConcepts(ctx context.Context, limit int) ([]repositories.ConceptPopularity, error) {
	collection := r.client.GetCollection("queries")

	pipeline := []bson.M{
		{"$unwind": "$identified_concepts"},
		{
			"$group": bson.M{
				"_id":   "$identified_concepts",
				"count": bson.M{"$sum": 1},
			},
		},
		{"$sort": bson.M{"count": -1}},
		{"$limit": limit},
		{
			"$project": bson.M{
				"concept_name": "$_id",
				"query_count":  "$count",
				"_id":          0,
			},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to get popular concepts: %w", err)
	}
	defer cursor.Close(ctx)

	var concepts []repositories.ConceptPopularity
	for cursor.Next(ctx) {
		var concept repositories.ConceptPopularity
		if err := cursor.Decode(&concept); err != nil {
			continue
		}
		concepts = append(concepts, concept)
	}

	return concepts, nil
}

func (r *mongoQueryRepository) GetQueryTrends(ctx context.Context, days int) ([]repositories.QueryTrend, error) {
	collection := r.client.GetCollection("queries")

	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -days)

	pipeline := []bson.M{
		{
			"$match": bson.M{
				"timestamp": bson.M{
					"$gte": startDate,
					"$lte": endDate,
				},
			},
		},
		{
			"$group": bson.M{
				"_id": bson.M{
					"year":  bson.M{"$year": "$timestamp"},
					"month": bson.M{"$month": "$timestamp"},
					"day":   bson.M{"$dayOfMonth": "$timestamp"},
				},
				"query_count": bson.M{"$sum": 1},
				"successful_queries": bson.M{
					"$sum": bson.M{"$cond": bson.M{"if": "$success", "then": 1, "else": 0}},
				},
			},
		},
		{"$sort": bson.M{"_id": 1}},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to get query trends: %w", err)
	}
	defer cursor.Close(ctx)

	var trends []repositories.QueryTrend
	for cursor.Next(ctx) {
		var result struct {
			ID struct {
				Year  int `bson:"year"`
				Month int `bson:"month"`
				Day   int `bson:"day"`
			} `bson:"_id"`
			QueryCount        int64 `bson:"query_count"`
			SuccessfulQueries int64 `bson:"successful_queries"`
		}

		if err := cursor.Decode(&result); err != nil {
			continue
		}

		successRate := float64(0)
		if result.QueryCount > 0 {
			successRate = float64(result.SuccessfulQueries) / float64(result.QueryCount) * 100
		}

		trends = append(trends, repositories.QueryTrend{
			Date:        time.Date(result.ID.Year, time.Month(result.ID.Month), result.ID.Day, 0, 0, 0, 0, time.UTC),
			QueryCount:  result.QueryCount,
			SuccessRate: successRate,
		})
	}

	return trends, nil
}

func (r *mongoQueryRepository) GetAnalytics(ctx context.Context, filters repositories.AnalyticsFilter) (*repositories.QueryAnalytics, error) {
	// Implementation would be similar to GetQueryStats but with filters applied
	stats, err := r.GetQueryStats(ctx)
	if err != nil {
		return nil, err
	}

	popular, err := r.GetPopularConcepts(ctx, 10)
	if err != nil {
		popular = []repositories.ConceptPopularity{}
	}

	return &repositories.QueryAnalytics{
		TotalQueries:      stats.TotalQueries,
		SuccessfulQueries: int64(float64(stats.TotalQueries) * stats.SuccessRate / 100),
		SuccessRate:       stats.SuccessRate,
		AvgProcessingTime: stats.AvgResponseTime,
		PopularConcepts:   popular,
	}, nil
}

func (r *mongoQueryRepository) IsHealthy(ctx context.Context) bool {
	return r.client.Ping(ctx) == nil
}
