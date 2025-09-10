package services

import (
    "context"
    "time"
    "github.com/mathprereq/internal/domain/entities"
    "github.com/mathprereq/internal/domain/repositories"
    "github.com/mathprereq/internal/types"
)

type QueryService interface {
    ProcessQuery(ctx context.Context, req *QueryRequest) (*QueryResult, error)
    GetConceptDetail(ctx context.Context, conceptID string) (*types.ConceptDetailResult, error)
    GetAllConcepts(ctx context.Context) ([]types.Concept, error)
    GetQueryStats(ctx context.Context) (*repositories.QueryStats, error)
    GetPopularConcepts(ctx context.Context, limit int) ([]repositories.ConceptPopularity, error)
    GetQueryTrends(ctx context.Context, days int) ([]repositories.QueryTrend, error)
    GetSystemStats(ctx context.Context) (*types.SystemStats, error)
}

type ResourceService interface {
    ScrapeAndGetResources(ctx context.Context, req *ResourceRequest) (*ResourceResult, error)
    FindResourcesByConcept(ctx context.Context, conceptID string, limit int) ([]*entities.LearningResource, error)
}

type QueryRequest struct {
    UserID    string `json:"user_id,omitempty" validate:"omitempty,uuid"`
    Question  string `json:"question" validate:"required,min=3,max=1000"`
    RequestID string `json:"request_id,omitempty"`
}

type QueryResult struct {
    Query              *entities.Query     `json:"query"`
    IdentifiedConcepts []string            `json:"identified_concepts"`
    PrerequisitePath   []types.Concept     `json:"prerequisite_path"`
    Explanation        string              `json:"explanation"`
    RetrievedContext   []string            `json:"retrieved_context"`
    ProcessingTime     time.Duration       `json:"processing_time"`
    RequestID          string              `json:"request_id"`
}

type ResourceRequest struct {
    ConceptName string `json:"concept_name" validate:"required"`
    Limit       int    `json:"limit,omitempty"`
}

type ResourceResult struct {
    ConceptName   string                      `json:"concept_name"`
    ConceptID     string                      `json:"concept_id"`
    Resources     []*entities.LearningResource `json:"resources"`
    ProcessingTime time.Duration               `json:"processing_time"`
}