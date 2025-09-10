package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/mathprereq/internal/data/scraper"
	"github.com/mathprereq/internal/domain/entities"
	"github.com/mathprereq/internal/domain/repositories"
	"github.com/mathprereq/internal/domain/services"
	"github.com/mathprereq/internal/types"
	"go.uber.org/zap"
)

type queryService struct {
	conceptRepo     repositories.ConceptRepository
	queryRepo       repositories.QueryRepository
	vectorRepo      repositories.VectorRepository
	llmClient       LLMClient
	resourceScraper *scraper.EducationalWebScraper
	logger          *zap.Logger
}

// LLMClient interface for the service layer
type LLMClient interface {
	IdentifyConcepts(ctx context.Context, query string) ([]string, error)
	GenerateExplanation(ctx context.Context, req ExplanationRequest) (string, error)
	Provider() string
	Model() string
	IsHealthy(ctx context.Context) bool
}

type ExplanationRequest struct {
	Query            string          `json:"query"`
	PrerequisitePath []types.Concept `json:"prerequisite_path"`
	ContextChunks    []string        `json:"context_chunks"`
}

func NewQueryService(
	conceptRepo repositories.ConceptRepository,
	queryRepo repositories.QueryRepository,
	vectorRepo repositories.VectorRepository,
	llmClient LLMClient,
	resourceScraper *scraper.EducationalWebScraper,
	logger *zap.Logger,
) services.QueryService {
	return &queryService{
		conceptRepo:     conceptRepo,
		queryRepo:       queryRepo,
		vectorRepo:      vectorRepo,
		llmClient:       llmClient,
		resourceScraper: resourceScraper,
		logger:          logger,
	}
}

func (s *queryService) ProcessQuery(ctx context.Context, req *services.QueryRequest) (*services.QueryResult, error) {
	startTime := time.Now()

	// Create query entity
	query := entities.NewQuery(req.UserID, req.Question, "")

	s.logger.Info("Processing query",
		zap.String("query_id", query.ID),
		zap.String("question", req.Question[:min(len(req.Question), 100)]))

	// Process through pipeline
	result, err := s.processQueryPipeline(ctx, query)

	// Always save query (success or failure)
	query.MarkCompleted(err == nil, err)
	s.saveQueryAsync(ctx, query)

	if err != nil {
		s.logger.Error("Query processing failed",
			zap.String("query_id", query.ID),
			zap.Error(err))
		return nil, fmt.Errorf("failed to process query: %w", err)
	}

	result.ProcessingTime = time.Since(startTime)

	s.logger.Info("Query processed successfully",
		zap.String("query_id", query.ID),
		zap.Duration("processing_time", result.ProcessingTime))

	return result, nil
}

func (s *queryService) processQueryPipeline(ctx context.Context, query *entities.Query) (*services.QueryResult, error) {
	var result = &services.QueryResult{Query: query}

	// Step 1: Extract concepts
	stepStart := time.Now()
	conceptNames, err := s.llmClient.IdentifyConcepts(ctx, query.Text)
	query.AddProcessingStep("identify_concepts", time.Since(stepStart), err == nil, err)
	if err != nil {
		return nil, fmt.Errorf("concept identification failed: %w", err)
	}

	query.IdentifiedConcepts = conceptNames
	result.IdentifiedConcepts = conceptNames

	// Step 2: Find prerequisite path
	stepStart = time.Now()
	prereqPath, err := s.conceptRepo.FindPrerequisitePath(ctx, conceptNames)
	query.AddProcessingStep("find_prerequisites", time.Since(stepStart), err == nil, err)
	if err != nil {
		return nil, fmt.Errorf("prerequisite path finding failed: %w", err)
	}

	query.PrerequisitePath = prereqPath
	result.PrerequisitePath = prereqPath

	// Step 3: Start background resource scraping for concepts (non-blocking)
	if s.resourceScraper != nil && len(conceptNames) > 0 {
		go s.scrapeResourcesAsync(ctx, conceptNames, query.ID)
	}

	// Step 4: Vector search
	stepStart = time.Now()
	vectorResults, err := s.vectorRepo.Search(ctx, query.Text, 5)
	query.AddProcessingStep("vector_search", time.Since(stepStart), err == nil, err)
	if err != nil {
		s.logger.Warn("Vector search failed", zap.Error(err))
		vectorResults = []types.VectorResult{}
	}

	context := make([]string, len(vectorResults))
	for i, vr := range vectorResults {
		context[i] = vr.Content
	}
	result.RetrievedContext = context

	// Step 4: Generate explanation
	stepStart = time.Now()
	explanation, err := s.llmClient.GenerateExplanation(ctx, ExplanationRequest{
		Query:            query.Text,
		PrerequisitePath: prereqPath,
		ContextChunks:    context,
	})
	query.AddProcessingStep("generate_explanation", time.Since(stepStart), err == nil, err)
	if err != nil {
		return nil, fmt.Errorf("explanation generation failed: %w", err)
	}

	query.Response = entities.QueryResponse{
		Explanation:      explanation,
		RetrievedContext: context,
		LLMProvider:      s.llmClient.Provider(),
		LLMModel:         s.llmClient.Model(),
	}
	result.Explanation = explanation

	return result, nil
}

func (s *queryService) saveQueryAsync(ctx context.Context, query *entities.Query) {
	go func() {
		saveCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := s.queryRepo.Save(saveCtx, query); err != nil {
			s.logger.Error("Failed to save query asynchronously",
				zap.Error(err),
				zap.String("query_id", query.ID))
		}
	}()
}

// scrapeResourcesAsync scrapes educational resources in the background
func (s *queryService) scrapeResourcesAsync(ctx context.Context, conceptNames []string, queryID string) {
	s.logger.Info("Starting background resource scraping",
		zap.String("query_id", queryID),
		zap.Strings("concepts", conceptNames))

	// Create a background context with timeout for scraping
	scraperCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Limit concepts to avoid excessive scraping
	maxConcepts := 5
	if len(conceptNames) > maxConcepts {
		conceptNames = conceptNames[:maxConcepts]
		s.logger.Info("Limited concept scraping",
			zap.Int("max_concepts", maxConcepts),
			zap.String("query_id", queryID))
	}

	// Start scraping in background
	if err := s.resourceScraper.ScrapeResourcesForConcepts(scraperCtx, conceptNames); err != nil {
		s.logger.Warn("Background resource scraping failed",
			zap.Error(err),
			zap.String("query_id", queryID),
			zap.Strings("concepts", conceptNames))
	} else {
		s.logger.Info("Background resource scraping completed successfully",
			zap.String("query_id", queryID),
			zap.Strings("concepts", conceptNames))
	}
}

// GetResourcesForConcepts retrieves scraped resources for given concepts
func (s *queryService) GetResourcesForConcepts(ctx context.Context, conceptNames []string, limit int) ([]scraper.EducationalResource, error) {
	if s.resourceScraper == nil {
		return nil, fmt.Errorf("resource scraper not available")
	}

	var allResources []scraper.EducationalResource

	for _, conceptName := range conceptNames {
		conceptID := s.generateConceptID(conceptName)
		resources, err := s.resourceScraper.GetResourcesForConcept(ctx, conceptID, limit)
		if err != nil {
			s.logger.Warn("Failed to get resources for concept",
				zap.String("concept", conceptName),
				zap.Error(err))
			continue
		}
		allResources = append(allResources, resources...)
	}

	// Sort by quality score (descending)
	for i := 0; i < len(allResources)-1; i++ {
		for j := 0; j < len(allResources)-i-1; j++ {
			if allResources[j].QualityScore < allResources[j+1].QualityScore {
				allResources[j], allResources[j+1] = allResources[j+1], allResources[j]
			}
		}
	}

	// Limit total results
	if len(allResources) > limit {
		allResources = allResources[:limit]
	}

	return allResources, nil
}

// generateConceptID creates a standardized concept ID (same logic as scraper)
func (s *queryService) generateConceptID(conceptName string) string {
	// Use same logic as scraper to ensure consistency
	return strings.ToLower(strings.ReplaceAll(conceptName, " ", "_"))
}

// Implement remaining service methods
func (s *queryService) GetConceptDetail(ctx context.Context, conceptID string) (*types.ConceptDetailResult, error) {
	return s.conceptRepo.GetConceptDetail(ctx, conceptID)
}

func (s *queryService) GetAllConcepts(ctx context.Context) ([]types.Concept, error) {
	return s.conceptRepo.GetAll(ctx)
}

func (s *queryService) GetQueryStats(ctx context.Context) (*repositories.QueryStats, error) {
	return s.queryRepo.GetQueryStats(ctx)
}

func (s *queryService) GetPopularConcepts(ctx context.Context, limit int) ([]repositories.ConceptPopularity, error) {
	return s.queryRepo.GetPopularConcepts(ctx, limit)
}

func (s *queryService) GetQueryTrends(ctx context.Context, days int) ([]repositories.QueryTrend, error) {
	return s.queryRepo.GetQueryTrends(ctx, days)
}

func (s *queryService) GetSystemStats(ctx context.Context) (*types.SystemStats, error) {
	return s.conceptRepo.GetStats(ctx)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
