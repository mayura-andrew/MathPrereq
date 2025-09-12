package mongodb

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/mathprereq/internal/data/neo4j"
	"github.com/mathprereq/pkg/logger"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
)

type QueryResponseRecord struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID             string             `bson:"user_id,omitempty" json:"user_id"` // Optional for future user tracking
	Query              string             `bson:"query" json:"query"`
	IdentifiedConcepts []string           `bson:"identified_concepts" json:"identified_concepts"`
	PrerequisitePath   []neo4j.Concept    `bson:"prerequisite_path" json:"prerequisite_path"`
	RetrievedContext   []string           `bson:"retrieved_context" json:"retrieved_context"`
	Explanation        string             `bson:"explanation" json:"explanation"`
	ResponseTime       time.Duration      `bson:"response_time" json:"response_time"`
	ProcessingSuccess  bool               `bson:"processing_success" json:"processing_success"`
	ErrorMessage       string             `bson:"error_message,omitempty" json:"error_message,omitempty"`
	Timestamp          time.Time          `bson:"timestamp" json:"timestamp"`
	UserAgent          string             `bson:"user_agent,omitempty" json:"user_agent,omitempty"`
	IPAddress          string             `bson:"ip_address,omitempty" json:"ip_address,omitempty"`
	SessionID          string             `bson:"session_id,omitempty" json:"session_id,omitempty"`
	LLMProvider        string             `bson:"llm_provider" json:"llm_provider"`
	LLMModel           string             `bson:"llm_model" json:"llm_model"`
	KnowledgeGraphHits int                `bson:"knowledge_graph_hits" json:"knowledge_graph_hits"`
	VectorStoreHits    int                `bson:"vector_store_hits" json:"vector_store_hits"`
}

// QueryAnalytics provides methods for storing and retrieving query data
type QueryAnalytics struct {
	collection *mongo.Collection
	logger     *zap.Logger
}

// NewQueryAnalytics creates a new query analytics instance using shared MongoDB client
func NewQueryAnalytics(mongoClient *mongo.Client, databaseName string) *QueryAnalytics {
	collection := mongoClient.Database(databaseName).Collection("query_responses")

	logger := logger.MustGetLogger()

	// Create indexes for efficient queries (with error handling like scraper)
	if err := createQueryAnalyticsIndexes(context.Background(), collection, logger); err != nil {
		// This error is expected if the user doesn't have admin rights, so we just log it.
		if strings.Contains(err.Error(), "requires authentication") || strings.Contains(err.Error(), "not authorized") {
			logger.Debug("Skipping index creation due to permissions", zap.Error(err))
		} else {
			logger.Warn("Failed to create query analytics indexes", zap.Error(err))
		}
	}

	logger.Info("Query analytics initialized successfully",
		zap.String("database", databaseName),
		zap.String("collection", "query_responses"))

	return &QueryAnalytics{
		collection: collection,
		logger:     logger,
	}
}

// createQueryAnalyticsIndexes creates MongoDB indexes for efficient queries
func createQueryAnalyticsIndexes(ctx context.Context, collection *mongo.Collection, logger *zap.Logger) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{"timestamp", -1}},
		},
		{
			Keys: bson.D{{"user_id", 1}, {"timestamp", -1}},
		},
		{
			Keys: bson.D{{"query", "text"}},
		},
		{
			Keys: bson.D{{"identified_concepts", 1}},
		},
		{
			Keys: bson.D{{"processing_success", 1}, {"timestamp", -1}},
		},
		{
			Keys: bson.D{{"llm_provider", 1}},
		},
		{
			Keys: bson.D{{"response_time", 1}},
		},
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	_, err := collection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		// Don't return an error for duplicate keys, as it's not a failure
		if !mongo.IsDuplicateKeyError(err) {
			return fmt.Errorf("failed to create indexes: %w", err)
		}
	}

	logger.Info("Query analytics indexes created successfully")
	return nil
}

// SaveQueryResponse saves a query response record to MongoDB
func (qa *QueryAnalytics) SaveQueryResponse(ctx context.Context, record *QueryResponseRecord) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	_, err := qa.collection.InsertOne(ctx, record)
	if err != nil {
		qa.logger.Error("Failed to save query response", zap.Error(err))
		return fmt.Errorf("failed to save query response: %w", err)
	}

	qa.logger.Info("Query response saved successfully",
		zap.String("query_id", record.ID.Hex()),
		zap.Bool("success", record.ProcessingSuccess),
		zap.Duration("response_time", record.ResponseTime))

	return nil
}

// GetQueryStats returns statistics about stored queries
func (qa *QueryAnalytics) GetQueryStats(ctx context.Context) (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{"$group", bson.D{
			{"_id", nil},
			{"total_queries", bson.D{{"$sum", 1}}},
			{"successful_queries", bson.D{{"$sum", bson.D{{"$cond", bson.A{bson.D{{"$eq", bson.A{"$processing_success", true}}}, 1, 0}}}}}},
			{"failed_queries", bson.D{{"$sum", bson.D{{"$cond", bson.A{bson.D{{"$eq", bson.A{"$processing_success", false}}}, 1, 0}}}}}},
			{"avg_response_time", bson.D{{"$avg", "$response_time"}}},
			{"total_concepts_identified", bson.D{{"$sum", bson.D{{"$size", "$identified_concepts"}}}}},
		}}},
	}

	cursor, err := qa.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate query stats: %w", err)
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("failed to decode query stats: %w", err)
	}

	if len(results) == 0 {
		return map[string]interface{}{
			"total_queries":             0,
			"successful_queries":        0,
			"failed_queries":            0,
			"avg_response_time":         0.0,
			"total_concepts_identified": 0,
		}, nil
	}

	return results[0], nil
}

// GetRecentQueries returns recent queries for a user
func (qa *QueryAnalytics) GetRecentQueries(ctx context.Context, userID string, limit int) ([]QueryResponseRecord, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	filter := bson.M{"user_id": userID}
	opts := options.Find().
		SetSort(bson.D{{"timestamp", -1}}).
		SetLimit(int64(limit))

	cursor, err := qa.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to query recent queries: %w", err)
	}
	defer cursor.Close(ctx)

	var queries []QueryResponseRecord
	if err := cursor.All(ctx, &queries); err != nil {
		return nil, fmt.Errorf("failed to decode recent queries: %w", err)
	}

	return queries, nil
}

// GetPopularConcepts returns the most frequently identified concepts
func (qa *QueryAnalytics) GetPopularConcepts(ctx context.Context, limit int) ([]map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{"$unwind", "$identified_concepts"}},
		{{"$group", bson.D{
			{"_id", "$identified_concepts"},
			{"count", bson.D{{"$sum", 1}}},
			{"last_queried", bson.D{{"$max", "$timestamp"}}},
		}}},
		{{"$sort", bson.D{{"count", -1}}}},
		{{"$limit", limit}},
	}

	cursor, err := qa.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate popular concepts: %w", err)
	}
	defer cursor.Close(ctx)

	var results []map[string]interface{}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("failed to decode popular concepts: %w", err)
	}

	return results, nil
}

// GetQueryTrends returns query trends over time
func (qa *QueryAnalytics) GetQueryTrends(ctx context.Context, days int) ([]map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	startDate := time.Now().AddDate(0, 0, -days)

	pipeline := mongo.Pipeline{
		{{"$match", bson.D{{"timestamp", bson.D{{"$gte", startDate}}}}}},
		{{"$group", bson.D{
			{"_id", bson.D{
				{"$dateToString", bson.D{
					{"format", "%Y-%m-%d"},
					{"date", "$timestamp"},
				}},
			}},
			{"total_queries", bson.D{{"$sum", 1}}},
			{"successful_queries", bson.D{{"$sum", bson.D{{"$cond", bson.A{bson.D{{"$eq", bson.A{"$processing_success", true}}}, 1, 0}}}}}},
			{"avg_response_time", bson.D{{"$avg", "$response_time"}}},
		}}},
		{{"$sort", bson.D{{"_id", 1}}}},
	}

	cursor, err := qa.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate query trends: %w", err)
	}
	defer cursor.Close(ctx)

	var results []map[string]interface{}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("failed to decode query trends: %w", err)
	}

	return results, nil
}
