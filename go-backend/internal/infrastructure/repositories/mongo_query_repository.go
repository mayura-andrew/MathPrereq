package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/mathprereq/internal/domain/entities"
	"github.com/mathprereq/internal/domain/repositories"
	"github.com/mathprereq/internal/types"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
)

type mongoQueryRepository struct {
	client     *mongo.Client
	database   *mongo.Database
	collection *mongo.Collection
	logger     *zap.Logger
}

func NewMongoQueryRepository(client *mongo.Client, dbName string, logger *zap.Logger) repositories.QueryRepository {
	database := client.Database(dbName)
	collection := database.Collection("queries")

	return &mongoQueryRepository{
		client:     client,
		database:   database,
		collection: collection,
		logger:     logger,
	}
}

// Helper method to get collection
func (r *mongoQueryRepository) getCollection(name string) *mongo.Collection {
	return r.database.Collection(name)
}

func (r *mongoQueryRepository) Save(ctx context.Context, query *entities.Query) error {
	collection := r.collection
	_, err := collection.InsertOne(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to save query: %w", err)
	}
	return nil
}

// FindByConceptName finds a successful query that contains the specified concept
func (r *mongoQueryRepository) FindByConceptName(ctx context.Context, conceptName string) (*entities.Query, error) {
	collection := r.database.Collection("queries")

	// Create filter to find successful queries with the concept in identified_concepts
	filter := bson.M{
		"identified_concepts": bson.M{
			"$in": []string{conceptName},
		},
		"success": true,
	}

	// Sort by timestamp descending to get the most recent match
	opts := options.FindOne().SetSort(bson.D{{"timestamp", -1}})

	var result bson.M
	err := collection.FindOne(ctx, filter, opts).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // No matching query found
		}
		return nil, fmt.Errorf("failed to find query by concept name: %w", err)
	}

	// Convert bson.M to entities.Query
	query, err := r.bsonToQuery(result)
	if err != nil {
		return nil, fmt.Errorf("failed to convert BSON to query entity: %w", err)
	}

	return query, nil
}

// bsonToQuery converts a BSON document to a Query entity
func (r *mongoQueryRepository) bsonToQuery(doc bson.M) (*entities.Query, error) {
	// Extract basic fields
	id, _ := doc["_id"].(string)
	text, _ := doc["text"].(string)
	userID, _ := doc["user_id"].(string)

	// Handle identified_concepts
	var identifiedConcepts []string
	if concepts, ok := doc["identified_concepts"].(bson.A); ok {
		for _, c := range concepts {
			if conceptStr, ok := c.(string); ok {
				identifiedConcepts = append(identifiedConcepts, conceptStr)
			}
		}
	}

	// Handle prerequisite_path
	var prereqPath []types.Concept
	if path, ok := doc["prerequisite_path"].(bson.A); ok {
		for _, p := range path {
			if pathDoc, ok := p.(bson.M); ok {
				concept := types.Concept{
					ID:          pathDoc["id"].(string),
					Name:        pathDoc["name"].(string),
					Description: pathDoc["description"].(string),
				}
				if conceptType, ok := pathDoc["type"].(string); ok {
					concept.Type = conceptType
				}
				prereqPath = append(prereqPath, concept)
			}
		}
	}

	// Handle response
	var response entities.QueryResponse
	if resp, ok := doc["response"].(bson.M); ok {
		if explanation, ok := resp["explanation"].(string); ok {
			response.Explanation = explanation
		}
		if provider, ok := resp["llm_provider"].(string); ok {
			response.LLMProvider = provider
		}
		if model, ok := resp["llm_model"].(string); ok {
			response.LLMModel = model
		}
		if context, ok := resp["retrieved_context"].(bson.A); ok {
			for _, c := range context {
				if contextStr, ok := c.(string); ok {
					response.RetrievedContext = append(response.RetrievedContext, contextStr)
				}
			}
		}
	}

	// Handle timestamp
	var timestamp time.Time
	if ts, ok := doc["timestamp"].(primitive.DateTime); ok {
		timestamp = ts.Time()
	}

	// Handle success flag
	success, _ := doc["success"].(bool)

	// Create query entity
	query := &entities.Query{
		ID:                 id,
		Text:               text,
		UserID:             userID,
		IdentifiedConcepts: identifiedConcepts,
		PrerequisitePath:   prereqPath,
		Response:           response,
		Timestamp:          timestamp,
		Success:            success,
	}

	return query, nil
}

func (r *mongoQueryRepository) FindByID(ctx context.Context, id string) (*entities.Query, error) {
	collection := r.collection
	var query entities.Query
	err := collection.FindOne(ctx, bson.M{"_id": id}).Decode(&query)
	if err != nil {
		return nil, fmt.Errorf("failed to find query: %w", err)
	}
	return &query, nil
}

func (r *mongoQueryRepository) FindByUserID(ctx context.Context, userID string, limit int) ([]*entities.Query, error) {
	collection := r.collection

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
	collection := r.collection

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
	collection := r.collection

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
	collection := r.collection

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
	err := r.client.Ping(ctx, nil)
	return err == nil
}
