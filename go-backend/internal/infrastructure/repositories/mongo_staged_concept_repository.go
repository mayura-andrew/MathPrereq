package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/mathprereq/internal/domain/entities"
	"github.com/mathprereq/internal/domain/repositories"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
)

type mongoStagedConceptRepository struct {
	client     *mongo.Client
	database   *mongo.Database
	collection *mongo.Collection
	logger     *zap.Logger
}

func NewMongoStagedConceptRepository(client *mongo.Client, dbName string, logger *zap.Logger) repositories.StagedConceptRepository {
	database := client.Database(dbName)
	collection := database.Collection("staged_concepts")

	// Create indexes for better query performance
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{"concept_name", 1}},
		},
		{
			Keys: bson.D{{"status", 1}},
		},
		{
			Keys: bson.D{{"occurrence_count", -1}},
		},
		{
			Keys: bson.D{{"identified_at", -1}},
		},
	}

	if _, err := collection.Indexes().CreateMany(ctx, indexes); err != nil {
		logger.Warn("Failed to create indexes for staged_concepts", zap.Error(err))
	}

	return &mongoStagedConceptRepository{
		client:     client,
		database:   database,
		collection: collection,
		logger:     logger,
	}
}

func (r *mongoStagedConceptRepository) Save(ctx context.Context, concept *entities.StagedConcept) error {
	_, err := r.collection.InsertOne(ctx, concept)
	if err != nil {
		return fmt.Errorf("failed to save staged concept: %w", err)
	}

	r.logger.Info("Staged concept saved successfully",
		zap.String("concept_id", concept.ID),
		zap.String("concept_name", concept.ConceptName))

	return nil
}

func (r *mongoStagedConceptRepository) FindByID(ctx context.Context, id string) (*entities.StagedConcept, error) {
	var concept entities.StagedConcept
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&concept)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find staged concept: %w", err)
	}
	return &concept, nil
}

func (r *mongoStagedConceptRepository) FindByConceptName(ctx context.Context, conceptName string) (*entities.StagedConcept, error) {
	// Use case-insensitive regex for better matching
	filter := bson.M{
		"concept_name": bson.M{
			"$regex":   fmt.Sprintf("^%s$", conceptName),
			"$options": "i",
		},
	}

	var concept entities.StagedConcept
	err := r.collection.FindOne(ctx, filter).Decode(&concept)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find staged concept by name: %w", err)
	}
	return &concept, nil
}

func (r *mongoStagedConceptRepository) Update(ctx context.Context, concept *entities.StagedConcept) error {
	filter := bson.M{"_id": concept.ID}
	update := bson.M{"$set": concept}

	result, err := r.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("failed to update staged concept: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("staged concept not found")
	}

	r.logger.Info("Staged concept updated successfully",
		zap.String("concept_id", concept.ID),
		zap.String("status", string(concept.Status)))

	return nil
}

func (r *mongoStagedConceptRepository) GetPending(ctx context.Context, limit, offset int) ([]*entities.StagedConcept, error) {
	filter := bson.M{"status": entities.StagedConceptStatusPending}
	opts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{"occurrence_count", -1}, {"identified_at", -1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending staged concepts: %w", err)
	}
	defer cursor.Close(ctx)

	var concepts []*entities.StagedConcept
	for cursor.Next(ctx) {
		var concept entities.StagedConcept
		if err := cursor.Decode(&concept); err != nil {
			r.logger.Warn("Failed to decode staged concept", zap.Error(err))
			continue
		}
		concepts = append(concepts, &concept)
	}

	r.logger.Info("Retrieved pending staged concepts",
		zap.Int("count", len(concepts)),
		zap.Int("limit", limit),
		zap.Int("offset", offset))

	return concepts, nil
}

func (r *mongoStagedConceptRepository) GetStats(ctx context.Context) (*repositories.StagedConceptStats, error) {
	pipeline := []bson.M{
		{
			"$group": bson.M{
				"_id":   "$status",
				"count": bson.M{"$sum": 1},
			},
		},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to get staged concept stats: %w", err)
	}
	defer cursor.Close(ctx)

	stats := &repositories.StagedConceptStats{}

	for cursor.Next(ctx) {
		var result struct {
			Status string `bson:"_id"`
			Count  int64  `bson:"count"`
		}

		if err := cursor.Decode(&result); err != nil {
			r.logger.Warn("Failed to decode stats result", zap.Error(err))
			continue
		}

		switch result.Status {
		case string(entities.StagedConceptStatusPending):
			stats.PendingCount = result.Count
		case string(entities.StagedConceptStatusApproved):
			stats.ApprovedCount = result.Count
		case string(entities.StagedConceptStatusRejected):
			stats.RejectedCount = result.Count
		case string(entities.StagedConceptStatusMerged):
			stats.MergedCount = result.Count
		}
	}

	// Get total count
	totalCount, err := r.collection.CountDocuments(ctx, bson.M{})
	if err == nil {
		stats.TotalCount = totalCount
	}

	// Get most recent pending concept
	var recentConcept entities.StagedConcept
	opts := options.FindOne().SetSort(bson.D{{"identified_at", -1}})
	err = r.collection.FindOne(ctx, bson.M{"status": entities.StagedConceptStatusPending}, opts).Decode(&recentConcept)
	if err == nil {
		stats.MostRecentPending = &recentConcept
	}

	r.logger.Info("Retrieved staged concept stats",
		zap.Int64("total", stats.TotalCount),
		zap.Int64("pending", stats.PendingCount),
		zap.Int64("approved", stats.ApprovedCount),
		zap.Int64("rejected", stats.RejectedCount),
		zap.Int64("merged", stats.MergedCount))

	return stats, nil
}

func (r *mongoStagedConceptRepository) Delete(ctx context.Context, id string) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return fmt.Errorf("failed to delete staged concept: %w", err)
	}

	if result.DeletedCount == 0 {
		return fmt.Errorf("staged concept not found")
	}

	r.logger.Info("Staged concept deleted", zap.String("concept_id", id))
	return nil
}

func (r *mongoStagedConceptRepository) IsHealthy(ctx context.Context) bool {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	err := r.client.Ping(ctx, nil)
	if err != nil {
		r.logger.Warn("Staged concept repository health check failed", zap.Error(err))
		return false
	}
	return true
}

// ...existing code...

func (r *mongoStagedConceptRepository) GetByStatus(ctx context.Context, status entities.StagedConceptStatus, limit, offset int) ([]*entities.StagedConcept, error) {
    filter := bson.M{"status": status}
    opts := options.Find().
        SetLimit(int64(limit)).
        SetSkip(int64(offset)).
        SetSort(bson.D{{"occurrence_count", -1}, {"identified_at", -1}})

    cursor, err := r.collection.Find(ctx, filter, opts)
    if err != nil {
        return nil, fmt.Errorf("failed to get staged concepts by status: %w", err)
    }
    defer cursor.Close(ctx)

    var concepts []*entities.StagedConcept
    for cursor.Next(ctx) {
        var concept entities.StagedConcept
        if err := cursor.Decode(&concept); err != nil {
            r.logger.Warn("Failed to decode staged concept", zap.Error(err))
            continue
        }
        concepts = append(concepts, &concept)
    }

    r.logger.Info("Retrieved staged concepts by status",
        zap.String("status", string(status)),
        zap.Int("count", len(concepts)),
        zap.Int("limit", limit),
        zap.Int("offset", offset))

    return concepts, nil
}

