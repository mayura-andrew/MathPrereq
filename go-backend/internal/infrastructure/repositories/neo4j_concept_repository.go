package repositories

import (
	"context"
	"fmt"
	"time"

	"github.com/mathprereq/internal/data/neo4j"
	"github.com/mathprereq/internal/domain/repositories"
	"github.com/mathprereq/internal/types"
	"go.uber.org/zap"
)

type neo4jConceptRepository struct {
	client *neo4j.Client
	logger *zap.Logger
}

func NewNeo4jConceptRepository(client *neo4j.Client, logger *zap.Logger) repositories.ConceptRepository {
	return &neo4jConceptRepository{
		client: client,
		logger: logger,
	}
}

func (r *neo4jConceptRepository) FindByID(ctx context.Context, id string) (*types.Concept, error) {
	conceptDetail, err := r.client.GetConceptInfo(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to find concept by ID: %w", err)
	}
	return r.convertToEntity(&conceptDetail.Concept), nil
}

func (r *neo4jConceptRepository) FindByName(ctx context.Context, name string) (*types.Concept, error) {
	conceptID, err := r.client.FindConceptID(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("failed to find concept by name: %w", err)
	}
	if conceptID == nil {
		return nil, fmt.Errorf("concept not found: %s", name)
	}
	return r.FindByID(ctx, *conceptID)
}

func (r *neo4jConceptRepository) GetAll(ctx context.Context) ([]types.Concept, error) {
	concepts, err := r.client.GetAllConcepts(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get all concepts: %w", err)
	}

	result := make([]types.Concept, len(concepts))
	for i, concept := range concepts {
		result[i] = *r.convertToEntity(&concept)
	}
	return result, nil
}

func (r *neo4jConceptRepository) FindPrerequisitePath(ctx context.Context, targetConcepts []string) ([]types.Concept, error) {
	concepts, err := r.client.FindPrerequisitePath(ctx, targetConcepts)
	if err != nil {
		return nil, fmt.Errorf("failed to find prerequisite path: %w", err)
	}

	result := make([]types.Concept, len(concepts))
	for i, concept := range concepts {
		result[i] = *r.convertToEntity(&concept)
	}
	return result, nil
}

func (r *neo4jConceptRepository) GetConceptDetail(ctx context.Context, conceptID string) (*types.ConceptDetailResult, error) {
	detail, err := r.client.GetConceptInfo(ctx, conceptID)
	if err != nil {
		return nil, fmt.Errorf("failed to get concept detail: %w", err)
	}

	var prerequisites []types.Concept
	for _, prereq := range detail.Prerequisites {
		prerequisites = append(prerequisites, *r.convertToEntity(&prereq))
	}

	var leadsTo []types.Concept
	for _, next := range detail.LeadsTo {
		leadsTo = append(leadsTo, *r.convertToEntity(&next))
	}

	return &types.ConceptDetailResult{
		Concept:             *r.convertToEntity(&detail.Concept),
		Prerequisites:       prerequisites,
		LeadsTo:             leadsTo,
		DetailedExplanation: detail.DetailedExplanation,
	}, nil
}

func (r *neo4jConceptRepository) GetStats(ctx context.Context) (*types.SystemStats, error) {
	stats, err := r.client.GetStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get stats: %w", err)
	}

	return &types.SystemStats{
		TotalConcepts:  extractInt64(stats, "total_concepts"),
		TotalChunks:    extractInt64(stats, "total_chunks"),
		TotalEdges:     extractInt64(stats, "total_edges"),
		KnowledgeGraph: extractString(stats, "status"),
		VectorStore:    "healthy",
		LLMProvider:    "available",
		SystemHealth:   extractString(stats, "status"),
	}, nil
}

func (r *neo4jConceptRepository) IsHealthy(ctx context.Context) bool {
	return r.client.IsHealthy(ctx)
}

// CreateConcept creates a new concept in the knowledge graph
func (r *neo4jConceptRepository) CreateConcept(ctx context.Context, concept *types.Concept) error {
	query := `
		CREATE (c:Concept {
			id: $id,
			name: $name,
			description: $description,
			type: $type,
			difficulty: $difficulty,
			category: $category,
			created_at: datetime(),
			updated_at: datetime()
		})
		RETURN c
	`

	params := map[string]interface{}{
		"id":          concept.ID,
		"name":        concept.Name,
		"description": concept.Description,
		"type":        concept.Type,
		"difficulty":  concept.Difficulty,
		"category":    concept.Category,
	}

	_, err := r.client.ExecuteQuery(ctx, query, params)
	if err != nil {
		r.logger.Error("Failed to create concept",
			zap.String("concept_id", concept.ID),
			zap.String("concept_name", concept.Name),
			zap.Error(err))
		return fmt.Errorf("failed to create concept: %w", err)
	}

	r.logger.Info("Created concept in knowledge graph",
		zap.String("concept_id", concept.ID),
		zap.String("concept_name", concept.Name),
		zap.Int("difficulty", concept.Difficulty),
		zap.String("category", concept.Category))

	return nil
}

// CreatePrerequisiteRelationship creates a REQUIRES relationship between two concepts
func (r *neo4jConceptRepository) CreatePrerequisiteRelationship(ctx context.Context, conceptID, prerequisiteID string) error {
	query := `
		MATCH (c:Concept {id: $conceptID})
		MATCH (p:Concept {id: $prerequisiteID})
		MERGE (c)-[r:REQUIRES]->(p)
		RETURN c, r, p
	`

	params := map[string]interface{}{
		"conceptID":      conceptID,
		"prerequisiteID": prerequisiteID,
	}

	_, err := r.client.ExecuteQuery(ctx, query, params)
	if err != nil {
		r.logger.Error("Failed to create prerequisite relationship",
			zap.String("concept_id", conceptID),
			zap.String("prerequisite_id", prerequisiteID),
			zap.Error(err))
		return fmt.Errorf("failed to create prerequisite relationship: %w", err)
	}

	r.logger.Info("Created prerequisite relationship",
		zap.String("concept_id", conceptID),
		zap.String("prerequisite_id", prerequisiteID))

	return nil
}

// ExistsByName checks if a concept exists by name (case-insensitive)
func (r *neo4jConceptRepository) ExistsByName(ctx context.Context, name string) (bool, error) {
	query := `
		MATCH (c:Concept)
		WHERE toLower(c.name) = toLower($name)
		RETURN count(c) > 0 as exists
	`

	params := map[string]interface{}{
		"name": name,
	}

	result, err := r.client.ExecuteQuery(ctx, query, params)
	if err != nil {
		r.logger.Error("Failed to check concept existence",
			zap.String("concept_name", name),
			zap.Error(err))
		return false, fmt.Errorf("failed to check concept existence: %w", err)
	}

	if len(result) > 0 {
		if exists, ok := result[0]["exists"].(bool); ok {
			return exists, nil
		}
	}

	return false, nil
}

// Helper function to convert neo4j.Concept to types.Concept
func (r *neo4jConceptRepository) convertToEntity(neo4jConcept *neo4j.Concept) *types.Concept {
	return &types.Concept{
		ID:          neo4jConcept.ID,
		Name:        neo4jConcept.Name,
		Description: neo4jConcept.Description,
		Type:        neo4jConcept.Type,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
}

// Helper functions
func extractInt64(data map[string]interface{}, key string) int64 {
	if value, exists := data[key]; exists {
		switch v := value.(type) {
		case int64:
			return v
		case int:
			return int64(v)
		case float64:
			return int64(v)
		}
	}
	return 0
}

func extractString(data map[string]interface{}, key string) string {
	if value, exists := data[key]; exists {
		if str, ok := value.(string); ok {
			return str
		}
	}
	return "unknown"
}
