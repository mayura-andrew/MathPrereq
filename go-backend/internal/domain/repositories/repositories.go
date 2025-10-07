package repositories

import (
	"context"
	"time"

	"github.com/mathprereq/internal/domain/entities"
	"github.com/mathprereq/internal/types"
)

type ConceptRepository interface {
	FindByID(ctx context.Context, id string) (*types.Concept, error)
	FindByName(ctx context.Context, name string) (*types.Concept, error)
	GetAll(ctx context.Context) ([]types.Concept, error)
	FindPrerequisitePath(ctx context.Context, targetConcepts []string) ([]types.Concept, error)
	GetConceptDetail(ctx context.Context, conceptID string) (*types.ConceptDetailResult, error)
	GetStats(ctx context.Context) (*types.SystemStats, error)
	IsHealthy(ctx context.Context) bool
	CreateConcept(ctx context.Context, concept *types.Concept) error
	CreatePrerequisiteRelationship(ctx context.Context, conceptID, prerequisiteID string) error
	ExistsByName(ctx context.Context, name string) (bool, error)
}

type QueryRepository interface {
	Save(ctx context.Context, query *entities.Query) error
	FindByID(ctx context.Context, id string) (*entities.Query, error)
	FindByUserID(ctx context.Context, userID string, limit int) ([]*entities.Query, error)
	FindByConceptName(ctx context.Context, conceptName string) (*entities.Query, error)
	GetAnalytics(ctx context.Context, filters AnalyticsFilter) (*QueryAnalytics, error)
	GetPopularConcepts(ctx context.Context, limit int) ([]ConceptPopularity, error)
	GetQueryTrends(ctx context.Context, days int) ([]QueryTrend, error)
	GetQueryStats(ctx context.Context) (*QueryStats, error)
	IsHealthy(ctx context.Context) bool
}

type ResourceRepository interface {
	Save(ctx context.Context, resource *entities.LearningResource) error
	SaveBatch(ctx context.Context, resources []*entities.LearningResource) error
	FindByConceptID(ctx context.Context, conceptID string, limit int) ([]*entities.LearningResource, error)
	Search(ctx context.Context, query string, filters ResourceFilter) ([]*entities.LearningResource, error)
	IsHealthy(ctx context.Context) bool
}

type VectorRepository interface {
	Search(ctx context.Context, query string, limit int) ([]types.VectorResult, error)
	IsHealthy(ctx context.Context) bool
	GetStats(ctx context.Context) (map[string]interface{}, error)
}

type StagedConceptRepository interface {
	// Save saves a staged concept
	Save(ctx context.Context, concept *entities.StagedConcept) error

	// FindByID finds a staged concept by ID
	FindByID(ctx context.Context, id string) (*entities.StagedConcept, error)

	// FindByConceptName finds a staged concept by name
	FindByConceptName(ctx context.Context, conceptName string) (*entities.StagedConcept, error)

	// GetPending gets all pending staged concepts
	GetPending(ctx context.Context, limit, offset int) ([]*entities.StagedConcept, error)

	// GetByStatus gets staged concepts by status
	GetByStatus(ctx context.Context, status entities.StagedConceptStatus, limit, offset int) ([]*entities.StagedConcept, error)

	// Update updates a staged concept
	Update(ctx context.Context, concept *entities.StagedConcept) error

	// GetStats gets statistics about staged concepts
	GetStats(ctx context.Context) (*StagedConceptStats, error)
}

type StagedConceptStats struct {
	TotalCount        int64                   `json:"total_count"`
	PendingCount      int64                   `json:"pending_count"`
	ApprovedCount     int64                   `json:"approved_count"`
	RejectedCount     int64                   `json:"rejected_count"`
	MergedCount       int64                   `json:"merged_count"`
	MostRecentPending *entities.StagedConcept `json:"most_recent_pending,omitempty"`
}

// Supporting types
type AnalyticsFilter struct {
	StartTime *time.Time
	EndTime   *time.Time
	UserID    *string
	Success   *bool
	Limit     int
}

type QueryAnalytics struct {
	TotalQueries      int64               `json:"total_queries"`
	SuccessfulQueries int64               `json:"successful_queries"`
	SuccessRate       float64             `json:"success_rate"`
	AvgProcessingTime float64             `json:"avg_processing_time_ms"`
	PopularConcepts   []ConceptPopularity `json:"popular_concepts"`
}

type ConceptPopularity struct {
	ConceptName string `json:"concept_name"`
	QueryCount  int64  `json:"query_count"`
}

type QueryTrend struct {
	Date        time.Time `json:"date"`
	QueryCount  int64     `json:"query_count"`
	SuccessRate float64   `json:"success_rate"`
}

type QueryStats struct {
	TotalQueries    int64   `json:"total_queries"`
	SuccessRate     float64 `json:"success_rate"`
	AvgResponseTime float64 `json:"avg_response_time_ms"`
}

type ResourceFilter struct {
	Type       *string
	Difficulty *string
	MinQuality *float64
	Limit      int
}
