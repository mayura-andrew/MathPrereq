package services

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/mathprereq/internal/data/scraper"
	"github.com/mathprereq/internal/domain/entities"
	"github.com/mathprereq/internal/domain/repositories"
	"github.com/mathprereq/internal/domain/services"
	"github.com/mathprereq/internal/mailer"
	"github.com/mathprereq/internal/types"
	"go.uber.org/zap"
)

type queryService struct {
	conceptRepo       repositories.ConceptRepository
	queryRepo         repositories.QueryRepository
	vectorRepo        repositories.VectorRepository
	stagedConceptRepo repositories.StagedConceptRepository
	llmClient         LLMClient
	resourceScraper   *scraper.EducationalWebScraper
	mailer            *mailer.Mailer
	adminEmail        string
	logger            *zap.Logger
}

type NewConceptAnalysis struct {
	ConceptName         string   `json:"concept_name"`
	Description         string   `json:"description"`
	SuggestedPrereqs    []string `json:"suggested_prerequisites"`
	SuggestedDifficulty int      `json:"suggested_difficulty"`
	SuggestedCategory   string   `json:"suggested_category"`
	Reasoning           string   `json:"reasoning"`
	IsLikelyNewConcept  bool     `json:"is_likely_new_concept"`
}

// ParallelFetchResult holds results from parallel data fetching
type ParallelFetchResult struct {
	Prerequisites []types.Concept
	VectorChunks  []string
	Resources     []scraper.EducationalResource
	Errors        []error
	Timings       map[string]time.Duration // Track individual fetch times
}

// LLMClient interface for the service layer
type LLMClient interface {
	IdentifyConcepts(ctx context.Context, query string) ([]string, error)
	GenerateExplanation(ctx context.Context, req ExplanationRequest) (string, error)
	AnalyzeNewConcept(ctx context.Context, conceptName string, queryContext string) (*NewConceptAnalysis, error)
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
	stagedConceptRepo repositories.StagedConceptRepository,
	llmClient LLMClient,
	resourceScraper *scraper.EducationalWebScraper,
	mailer *mailer.Mailer,
	adminEmail string,
	logger *zap.Logger,
) services.QueryService {
	return &queryService{
		conceptRepo:       conceptRepo,
		queryRepo:         queryRepo,
		vectorRepo:        vectorRepo,
		stagedConceptRepo: stagedConceptRepo,
		llmClient:         llmClient,
		resourceScraper:   resourceScraper,
		mailer:            mailer,
		adminEmail:        adminEmail,
		logger:            logger,
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

	// Step 1: Extract concepts (sequential - needed for next steps)
	stepStart := time.Now()
	conceptNames, err := s.llmClient.IdentifyConcepts(ctx, query.Text)
	query.AddProcessingStep("identify_concepts", time.Since(stepStart), err == nil, err)
	if err != nil {
		return nil, fmt.Errorf("concept identification failed: %w", err)
	}

	query.IdentifiedConcepts = conceptNames
	result.IdentifiedConcepts = conceptNames

	// Step 2: Parallel data fetching from multiple sources using channels
	s.logger.Info("Starting parallel data fetch",
		zap.Strings("concepts", conceptNames),
		zap.String("query_id", query.ID))

	fetchResult := s.parallelDataFetch(ctx, conceptNames, query.Text, query)

	// Log any non-critical errors but continue processing
	if len(fetchResult.Errors) > 0 {
		for _, fetchErr := range fetchResult.Errors {
			s.logger.Warn("Non-critical fetch error", zap.Error(fetchErr))
		}
	}

	// Use fetched data
	query.PrerequisitePath = fetchResult.Prerequisites
	result.PrerequisitePath = fetchResult.Prerequisites
	result.RetrievedContext = fetchResult.VectorChunks

	// Step 3: Generate explanation with all gathered context
	stepStart = time.Now()
	explanation, err := s.llmClient.GenerateExplanation(ctx, ExplanationRequest{
		Query:            query.Text,
		PrerequisitePath: fetchResult.Prerequisites,
		ContextChunks:    fetchResult.VectorChunks,
	})
	query.AddProcessingStep("generate_explanation", time.Since(stepStart), err == nil, err)
	if err != nil {
		return nil, fmt.Errorf("explanation generation failed: %w", err)
	}

	query.Response = entities.QueryResponse{
		Explanation:      explanation,
		RetrievedContext: fetchResult.VectorChunks,
		LLMProvider:      s.llmClient.Provider(),
		LLMModel:         s.llmClient.Model(),
	}
	result.Explanation = explanation

	// Background tasks (non-blocking) - these run after response is ready
	go s.detectAndStageNewConcepts(context.Background(), conceptNames, query)

	return result, nil
}

func (s *queryService) saveQueryAsync(ctx context.Context, query *entities.Query) {
	go func() {
		// Use a new context for the async operation
		saveCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := s.queryRepo.Save(saveCtx, query); err != nil {
			s.logger.Error("Failed to save query asynchronously",
				zap.Error(err),
				zap.String("query_id", query.ID))
		}
	}()
}

// ============================================================================
// PARALLEL DATA FETCHING WITH GO CHANNELS
// ============================================================================

// parallelDataFetch orchestrates concurrent fetching from multiple data sources
// This significantly improves performance by running Neo4j, Weaviate, and scraper
// queries in parallel instead of sequentially.
func (s *queryService) parallelDataFetch(ctx context.Context, conceptNames []string, queryText string, query *entities.Query) ParallelFetchResult {
	// Create buffered channels for results (buffer size 1 to avoid blocking)
	prereqChan := make(chan []types.Concept, 1)
	vectorChan := make(chan []string, 1)
	resourceChan := make(chan []scraper.EducationalResource, 1)
	errorChan := make(chan error, 3) // Buffer for up to 3 errors

	// Create context with timeout for all parallel operations
	// This prevents any single slow operation from blocking the entire pipeline
	// Increased to 10 seconds to accommodate Neo4j prerequisite path queries which can be complex
	fetchCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Track timing for each fetch operation
	timingChan := make(chan struct {
		source   string
		duration time.Duration
	}, 3)

	fetchStart := time.Now()

	// Launch goroutines for parallel fetching
	// Each runs independently and sends results through channels
	go s.fetchPrerequisites(fetchCtx, conceptNames, query, prereqChan, errorChan, timingChan)
	go s.fetchVectorContext(fetchCtx, queryText, query, vectorChan, errorChan, timingChan)
	go s.fetchResources(fetchCtx, conceptNames, resourceChan, errorChan, timingChan)

	// Collect results with timeout protection
	result := ParallelFetchResult{
		Prerequisites: []types.Concept{},
		VectorChunks:  []string{},
		Resources:     []scraper.EducationalResource{},
		Errors:        []error{},
		Timings:       make(map[string]time.Duration),
	}

	// Use select to handle results as they arrive (non-blocking)
	// This allows faster operations to complete while slower ones continue
	completed := 0
	timingsReceived := 0

	for completed < 3 || timingsReceived < 3 {
		select {
		case prereqs := <-prereqChan:
			result.Prerequisites = prereqs
			completed++
			s.logger.Debug("Prerequisites received",
				zap.Int("count", len(prereqs)))

		case vectors := <-vectorChan:
			result.VectorChunks = vectors
			completed++
			s.logger.Debug("Vector chunks received",
				zap.Int("count", len(vectors)))

		case resources := <-resourceChan:
			result.Resources = resources
			completed++
			s.logger.Debug("Resources received",
				zap.Int("count", len(resources)))

		case timing := <-timingChan:
			result.Timings[timing.source] = timing.duration
			timingsReceived++

		case err := <-errorChan:
			if err != nil {
				result.Errors = append(result.Errors, err)
			}

		case <-fetchCtx.Done():
			// Timeout occurred - log detailed information about what completed and what didn't
			incomplete := []string{}
			if completed < 3 {
				// Check which operations didn't complete
				select {
				case <-prereqChan:
					// Prerequisites completed but not received yet
				default:
					incomplete = append(incomplete, "prerequisites")
				}
				select {
				case <-vectorChan:
					// Vectors completed but not received yet
				default:
					incomplete = append(incomplete, "vectors")
				}
				select {
				case <-resourceChan:
					// Resources completed but not received yet
				default:
					incomplete = append(incomplete, "resources")
				}
			}

			result.Errors = append(result.Errors, fmt.Errorf("parallel fetch timeout after %v", time.Since(fetchStart)))
			s.logger.Warn("Parallel fetch timed out",
				zap.Int("completed", completed),
				zap.Strings("incomplete_operations", incomplete),
				zap.Duration("elapsed", time.Since(fetchStart)),
				zap.Any("completed_timings", result.Timings))
			return result
		}
	}

	totalDuration := time.Since(fetchStart)
	s.logger.Info("Parallel data fetch completed",
		zap.Int("prerequisites", len(result.Prerequisites)),
		zap.Int("vector_chunks", len(result.VectorChunks)),
		zap.Int("resources", len(result.Resources)),
		zap.Int("errors", len(result.Errors)),
		zap.Duration("total_duration", totalDuration),
		zap.Any("individual_timings", result.Timings))

	return result
}

// fetchPrerequisites retrieves concept prerequisites from Neo4j in a goroutine
func (s *queryService) fetchPrerequisites(
	ctx context.Context,
	conceptNames []string,
	query *entities.Query,
	resultChan chan<- []types.Concept,
	errorChan chan<- error,
	timingChan chan<- struct {
		source   string
		duration time.Duration
	},
) {
	stepStart := time.Now()
	defer func() {
		timingChan <- struct {
			source   string
			duration time.Duration
		}{"neo4j", time.Since(stepStart)}
	}()

	prereqPath, err := s.conceptRepo.FindPrerequisitePath(ctx, conceptNames)

	// Track this step in the query analytics
	if query != nil {
		query.AddProcessingStep("find_prerequisites", time.Since(stepStart), err == nil, err)
	}

	if err != nil {
		s.logger.Warn("Failed to fetch prerequisites",
			zap.Error(err),
			zap.Duration("duration", time.Since(stepStart)))
		errorChan <- fmt.Errorf("prerequisite fetch failed: %w", err)
		resultChan <- []types.Concept{} // Send empty result for graceful degradation
		return
	}

	s.logger.Debug("Prerequisites fetched successfully",
		zap.Duration("duration", time.Since(stepStart)),
		zap.Int("count", len(prereqPath)))

	resultChan <- prereqPath
	errorChan <- nil // Signal no error
}

// fetchVectorContext retrieves semantic context from Weaviate in a goroutine
func (s *queryService) fetchVectorContext(
	ctx context.Context,
	queryText string,
	query *entities.Query,
	resultChan chan<- []string,
	errorChan chan<- error,
	timingChan chan<- struct {
		source   string
		duration time.Duration
	},
) {
	stepStart := time.Now()
	defer func() {
		timingChan <- struct {
			source   string
			duration time.Duration
		}{"weaviate", time.Since(stepStart)}
	}()

	vectorResults, err := s.vectorRepo.Search(ctx, queryText, 5)

	// Track this step in the query analytics
	if query != nil {
		query.AddProcessingStep("vector_search", time.Since(stepStart), err == nil, err)
	}

	if err != nil {
		s.logger.Warn("Vector search failed",
			zap.Error(err),
			zap.Duration("duration", time.Since(stepStart)))
		errorChan <- fmt.Errorf("vector search failed: %w", err)
		resultChan <- []string{} // Send empty result for graceful degradation
		return
	}

	// Extract content from vector results
	contextChunks := make([]string, len(vectorResults))
	for i, vr := range vectorResults {
		contextChunks[i] = vr.Content
	}

	s.logger.Debug("Vector context fetched successfully",
		zap.Duration("duration", time.Since(stepStart)),
		zap.Int("chunks", len(contextChunks)))

	resultChan <- contextChunks
	errorChan <- nil // Signal no error
}

// fetchResources retrieves educational resources from scraper in a goroutine
func (s *queryService) fetchResources(
	ctx context.Context,
	conceptNames []string,
	resultChan chan<- []scraper.EducationalResource,
	errorChan chan<- error,
	timingChan chan<- struct {
		source   string
		duration time.Duration
	},
) {
	stepStart := time.Now()
	defer func() {
		timingChan <- struct {
			source   string
			duration time.Duration
		}{"scraper", time.Since(stepStart)}
	}()

	// If scraper is not available, return empty results
	if s.resourceScraper == nil {
		s.logger.Debug("Resource scraper not available")
		resultChan <- []scraper.EducationalResource{}
		errorChan <- nil
		return
	}

	// Limit concepts to avoid excessive resource fetching
	maxConcepts := 3
	limitedConcepts := conceptNames
	if len(conceptNames) > maxConcepts {
		limitedConcepts = conceptNames[:maxConcepts]
		s.logger.Debug("Limited resource fetching",
			zap.Int("original", len(conceptNames)),
			zap.Int("limited", maxConcepts))
	}

	// Fetch resources for concepts
	resources, err := s.GetResourcesForConcepts(ctx, limitedConcepts, 10)
	if err != nil {
		s.logger.Warn("Failed to fetch resources",
			zap.Error(err),
			zap.Duration("duration", time.Since(stepStart)))
		errorChan <- fmt.Errorf("resource fetch failed: %w", err)
		resultChan <- []scraper.EducationalResource{}
		return
	}

	s.logger.Debug("Resources fetched successfully",
		zap.Duration("duration", time.Since(stepStart)),
		zap.Int("count", len(resources)))

	resultChan <- resources
	errorChan <- nil // Signal no error
}

// ============================================================================
// END PARALLEL DATA FETCHING
// ============================================================================

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

// FindCachedConceptQuery searches for existing queries that match the concept
func (s *queryService) FindCachedConceptQuery(ctx context.Context, conceptName string) (*entities.Query, error) {
	// Normalize the concept name for better matching
	normalizedConcept := strings.TrimSpace(strings.ToLower(conceptName))

	// Try multiple search strategies
	searchStrategies := []string{
		conceptName,                      // Exact match
		normalizedConcept,                // Normalized match
		strings.Title(normalizedConcept), // Title case
	}

	for _, searchTerm := range searchStrategies {
		query, err := s.queryRepo.FindByConceptName(ctx, searchTerm)
		if err != nil {
			s.logger.Warn("Error searching for cached concept",
				zap.String("search_term", searchTerm),
				zap.Error(err))
			continue
		}

		if query != nil {
			s.logger.Info("Found cached concept query",
				zap.String("concept", conceptName),
				zap.String("search_term", searchTerm),
				zap.String("cached_query_id", query.ID),
				zap.Time("cached_at", query.Timestamp))
			return query, nil
		}
	}

	// No cached query found
	s.logger.Info("No cached query found for concept", zap.String("concept", conceptName))
	return nil, nil
}

// SmartConceptQuery checks cache first, then processes if needed
func (s *queryService) SmartConceptQuery(ctx context.Context, conceptName, userID, requestID string) (*services.QueryResult, error) {
	startTime := time.Now()

	s.logger.Info("Smart concept query started",
		zap.String("concept", conceptName),
		zap.String("user_id", userID),
		zap.String("request_id", requestID))

	// Step 1: Try to find cached query for this concept in MongoDB
	s.logger.Info("Checking MongoDB cache for concept", zap.String("concept", conceptName))

	cachedQuery, err := s.FindCachedConceptQuery(ctx, conceptName)
	if err != nil {
		s.logger.Warn("Failed to search MongoDB cache",
			zap.String("concept", conceptName),
			zap.Error(err))
		// Continue to fresh processing if cache search fails
	}

	// Step 2: If we have cached data and it's relatively recent (within 30 days), return it
	if cachedQuery != nil {
		cacheAge := time.Since(cachedQuery.Timestamp)
		maxCacheAge := 30 * 24 * time.Hour // 30 days for math concepts

		if cacheAge < maxCacheAge {
			s.logger.Info("Returning cached concept data",
				zap.String("concept", conceptName),
				zap.String("cached_query_id", cachedQuery.ID),
				zap.Time("cached_at", cachedQuery.Timestamp),
				zap.Duration("cache_age", cacheAge))

			// Start background resource gathering (non-blocking)
			go s.gatherResourcesInBackground(ctx, conceptName, cachedQuery.IdentifiedConcepts)

			// Convert cached query to QueryResult
			result := &services.QueryResult{
				Query:              cachedQuery,
				IdentifiedConcepts: cachedQuery.IdentifiedConcepts,
				PrerequisitePath:   cachedQuery.PrerequisitePath,
				RetrievedContext:   cachedQuery.Response.RetrievedContext,
				Explanation:        cachedQuery.Response.Explanation,
				ProcessingTime:     time.Since(startTime),
				RequestID:          requestID,
			}

			s.logger.Info("Smart concept query completed from cache",
				zap.String("concept", conceptName),
				zap.Duration("total_time", result.ProcessingTime),
				zap.Duration("cache_age", cacheAge))

			return result, nil
		} else {
			s.logger.Info("Cached data is too old, processing fresh query",
				zap.String("concept", conceptName),
				zap.Duration("cache_age", cacheAge),
				zap.Duration("max_age", maxCacheAge))
		}
	} else {
		s.logger.Info("No cached data found, processing fresh query",
			zap.String("concept", conceptName))
	}

	// Step 3: No suitable cached data found, process fresh query
	s.logger.Info("Processing fresh concept query", zap.String("concept", conceptName))

	// Create a query request for the concept name
	// Use a more specific prompt for better concept explanation
	conceptQuestion := s.buildConceptQueryPrompt(conceptName)

	queryReq := &services.QueryRequest{
		UserID:    userID,
		Question:  conceptQuestion,
		RequestID: requestID,
	}

	// Process the query through the normal pipeline
	result, err := s.ProcessQuery(ctx, queryReq)
	if err != nil {
		s.logger.Error("Fresh concept query processing failed",
			zap.String("concept", conceptName),
			zap.Error(err))
		return nil, fmt.Errorf("failed to process fresh concept query: %w", err)
	}

	s.logger.Info("Smart concept query completed with fresh processing",
		zap.String("concept", conceptName),
		zap.Duration("total_time", time.Since(startTime)),
		zap.Int("identified_concepts", len(result.IdentifiedConcepts)),
		zap.Int("prerequisite_path_length", len(result.PrerequisitePath)))

	return result, nil
}

// buildConceptQueryPrompt creates an optimized prompt for concept explanation
func (s *queryService) buildConceptQueryPrompt(conceptName string) string {
	// Create a comprehensive prompt that encourages detailed explanation
	return fmt.Sprintf(`Please provide a comprehensive explanation of the mathematical concept "%s". 

Include the following in your explanation:
1. Definition and core principles
2. Prerequisites needed to understand this concept
3. Key formulas or theorems (if applicable)
4. Step-by-step examples with clear explanations
5. Common applications and real-world uses
6. Common mistakes students make and how to avoid them
7. Connections to other mathematical concepts

Make the explanation educational, detailed, and suitable for students learning this concept.`, conceptName)
}

// gatherResourcesInBackground starts resource gathering without blocking the response
func (s *queryService) gatherResourcesInBackground(ctx context.Context, conceptName string, identifiedConcepts []string) {
	s.logger.Info("Starting background resource gathering",
		zap.String("concept", conceptName),
		zap.Strings("identified_concepts", identifiedConcepts))

	// Create a background context with timeout
	bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	// Use all concepts for resource gathering (both original concept and identified ones)
	allConcepts := []string{conceptName}
	allConcepts = append(allConcepts, identifiedConcepts...)

	// Remove duplicates
	uniqueConcepts := s.removeDuplicateStrings(allConcepts)

	// Limit concepts to avoid excessive scraping
	maxConcepts := 3
	if len(uniqueConcepts) > maxConcepts {
		uniqueConcepts = uniqueConcepts[:maxConcepts]
		s.logger.Info("Limited background concept scraping",
			zap.Int("max_concepts", maxConcepts),
			zap.String("original_concept", conceptName))
	}

	// Start background scraping
	if s.resourceScraper != nil {
		if err := s.resourceScraper.ScrapeResourcesForConcepts(bgCtx, uniqueConcepts); err != nil {
			s.logger.Warn("Background resource gathering failed",
				zap.Error(err),
				zap.String("concept", conceptName),
				zap.Strings("concepts", uniqueConcepts))
		} else {
			s.logger.Info("Background resource gathering completed",
				zap.String("concept", conceptName),
				zap.Strings("concepts", uniqueConcepts))
		}
	}
} // generateConceptID creates a standardized concept ID (same logic as scraper)
func (s *queryService) generateConceptID(conceptName string) string {
	// Use same logic as scraper to ensure consistency
	return strings.ToLower(strings.ReplaceAll(conceptName, " ", "_"))
}

// removeDuplicateStrings removes duplicate strings from a slice
func (s *queryService) removeDuplicateStrings(input []string) []string {
	keys := make(map[string]bool)
	var result []string

	for _, item := range input {
		normalized := strings.TrimSpace(strings.ToLower(item))
		if !keys[normalized] && normalized != "" {
			keys[normalized] = true
			result = append(result, item)
		}
	}

	return result
}

func (s *queryService) detectAndStageNewConcepts(ctx context.Context, conceptNames []string, query *entities.Query) {
	if s.stagedConceptRepo == nil {
		s.logger.Warn("StagedConceptRepository is not configured, skipping new concept detection.")
		return
	}

	s.logger.Info("Checking for new concepts to stage",
		zap.String("query_id", query.ID),
		zap.Strings("concepts", conceptNames))

	bgCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	for _, conceptName := range conceptNames {
		// Normalize concept name to avoid duplicates with different casing/spacing
		normalizedConceptName := strings.TrimSpace(strings.ToLower(conceptName))
		if normalizedConceptName == "" {
			continue
		}

		exists, err := s.conceptRepo.ExistsByName(bgCtx, normalizedConceptName)
		if err != nil {
			s.logger.Warn("Failed to check concept existence",
				zap.String("concept", normalizedConceptName),
				zap.Error(err))
			continue
		}

		if exists {
			s.logger.Debug("Concept already exists in KG",
				zap.String("concept", normalizedConceptName))
			continue
		}

		existing, err := s.stagedConceptRepo.FindByConceptName(bgCtx, normalizedConceptName)
		if err != nil {
			s.logger.Warn("Failed to check staged concept",
				zap.String("concept", normalizedConceptName),
				zap.Error(err))
			continue
		}

		if existing != nil {
			// Update occurrence count
			existing.IncrementOccurrence(query.ID)
			if err := s.stagedConceptRepo.Update(bgCtx, existing); err != nil {
				s.logger.Warn("Failed to update staged concept occurrence",
					zap.String("concept", normalizedConceptName),
					zap.Error(err))
			}
			s.logger.Info("Incremented occurrence for existing staged concept",
				zap.String("concept", normalizedConceptName),
				zap.Int("new_count", existing.OccurrenceCount))
			continue
		}

		// New concept detected - analyze it with LLM
		s.logger.Info("New concept detected, analyzing",
			zap.String("concept", conceptName))

		analysis, err := s.llmClient.AnalyzeNewConcept(bgCtx, conceptName, query.Text)
		if err != nil {
			s.logger.Warn("Failed to analyze new concept",
				zap.String("concept", conceptName),
				zap.Error(err))
			continue
		}

		if !analysis.IsLikelyNewConcept {
			s.logger.Info("LLM determined this is not a new mathematical concept",
				zap.String("concept", conceptName),
				zap.String("reasoning", analysis.Reasoning))
			continue
		}

		// Create staged concept using the original name, but check was done on normalized
		staged := entities.NewStagedConcept(
			conceptName,
			analysis.Description,
			query.ID,
			query.Text,
			query.UserID,
			analysis.SuggestedPrereqs,
			analysis.SuggestedDifficulty,
			analysis.SuggestedCategory,
			analysis.Reasoning,
		)

		if err := s.stagedConceptRepo.Save(bgCtx, staged); err != nil {
			s.logger.Error("Failed to save staged concept",
				zap.String("concept", conceptName),
				zap.Error(err))
			continue
		}

		s.logger.Info("New concept staged for review",
			zap.String("concept", conceptName),
			zap.String("staged_id", staged.ID),
			zap.Int("difficulty", analysis.SuggestedDifficulty),
			zap.Strings("prerequisites", analysis.SuggestedPrereqs))

		// Send email notification asynchronously using goroutine
		go s.sendNewConceptNotification(staged, query)
	}
}

// sendNewConceptNotification sends an email notification for a new staged concept
func (s *queryService) sendNewConceptNotification(staged *entities.StagedConcept, query *entities.Query) {
	if s.mailer == nil || !s.mailer.IsEnabled() {
		s.logger.Debug("Mailer not configured or disabled, skipping email notification")
		return
	}

	if s.adminEmail == "" {
		s.logger.Warn("Admin email not configured, cannot send notification")
		return
	}

	s.logger.Info("Sending email notification for new concept",
		zap.String("concept", staged.ConceptName),
		zap.String("admin_email", s.adminEmail))

	// Prepare email template data
	emailData := map[string]interface{}{
		"ConceptName":         staged.ConceptName,
		"Description":         staged.Description,
		"SuggestedDifficulty": staged.SuggestedDifficulty,
		"SuggestedCategory":   staged.SuggestedCategory,
		"SuggestedPrereqs":    staged.SuggestedPrerequisites,
		"Reasoning":           staged.LLMReasoning,
		"QueryID":             staged.SourceQueryID,
		"QueryContext":        staged.SourceQueryText,
		"UserID":              staged.SubmittedBy,
		"DetectedAt":          staged.IdentifiedAt.Format("2006-01-02 15:04:05 MST"),
	}

	// Get the absolute path to the template file
	templatePath := filepath.Join("internal", "mailer", "templates", "new_concept_identified.tmpl")

	// Send email with timeout context
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Create a channel to handle the result
	done := make(chan error, 1)

	go func() {
		err := s.mailer.Send(s.adminEmail, templatePath, emailData)
		done <- err
	}()

	// Wait for email to be sent or timeout
	select {
	case err := <-done:
		if err != nil {
			s.logger.Error("Failed to send new concept notification email",
				zap.String("concept", staged.ConceptName),
				zap.Error(err))
		} else {
			s.logger.Info("New concept notification email sent successfully",
				zap.String("concept", staged.ConceptName),
				zap.String("admin_email", s.adminEmail))
		}
	case <-ctx.Done():
		s.logger.Error("Email notification timed out",
			zap.String("concept", staged.ConceptName),
			zap.Error(ctx.Err()))
	}
}

func (s *queryService) GetPendingConcepts(ctx context.Context, limit, offset int) ([]*entities.StagedConcept, error) {
	return s.stagedConceptRepo.GetPending(ctx, limit, offset)
}

func (s *queryService) ApproveStagedConcept(ctx context.Context, stagedID string, reviewerID string, notes string) error {
	staged, err := s.stagedConceptRepo.FindByID(ctx, stagedID)
	if err != nil {
		return fmt.Errorf("failed to find staged concept: %w", err)
	}
	if staged == nil {
		return fmt.Errorf("staged concept not found")
	}

	if staged.Status != entities.StagedConceptStatusPending {
		return fmt.Errorf("concept has already been reviewed")
	}

	// Normalize concept ID for consistency
	conceptID := s.generateConceptID(staged.ConceptName)

	newConcept := types.Concept{
		ID:            conceptID,
		Name:          staged.ConceptName,
		Prerequisites: staged.SuggestedPrerequisites,
		Difficulty:    staged.SuggestedDifficulty,
		Category:      staged.SuggestedCategory,
		Description:   staged.Description,
	}

	// Create concept in Neo4j knowledge graph
	if err := s.conceptRepo.CreateConcept(ctx, &newConcept); err != nil {
		return fmt.Errorf("failed to create concept in KG: %w", err)
	}

	// Create prerequisite relationships in Neo4j
	if len(staged.SuggestedPrerequisites) > 0 {
		s.logger.Info("Creating prerequisite relationships",
			zap.String("concept", newConcept.Name),
			zap.Strings("prerequisites", staged.SuggestedPrerequisites))

		for _, prereqName := range staged.SuggestedPrerequisites {
			// Normalize prerequisite ID
			prereqID := s.generateConceptID(prereqName)

			// Check if prerequisite exists in KG
			prereqExists, err := s.conceptRepo.ExistsByName(ctx, prereqName)
			if err != nil {
				s.logger.Warn("Failed to check prerequisite existence",
					zap.String("prerequisite", prereqName),
					zap.Error(err))
				continue
			}

			if !prereqExists {
				s.logger.Warn("Prerequisite concept not found in KG, skipping relationship",
					zap.String("concept", newConcept.Name),
					zap.String("prerequisite", prereqName))
				continue
			}

			// Create REQUIRES relationship in Neo4j
			if err := s.conceptRepo.CreatePrerequisiteRelationship(ctx, conceptID, prereqID); err != nil {
				s.logger.Error("Failed to create prerequisite relationship",
					zap.String("concept", newConcept.Name),
					zap.String("prerequisite", prereqName),
					zap.Error(err))
				// Continue with other relationships even if one fails
			} else {
				s.logger.Info("Prerequisite relationship created",
					zap.String("concept", newConcept.Name),
					zap.String("prerequisite", prereqName))
			}
		}
	}

	// Update staged concept status
	staged.Approve(reviewerID, notes, newConcept.ID)
	if err := s.stagedConceptRepo.Update(ctx, staged); err != nil {
		// Log error but don't fail - concept is already in KG
		s.logger.Error("Failed to update staged concept status (concept already added to KG)",
			zap.String("staged_id", staged.ID),
			zap.Error(err))
	}

	s.logger.Info("Staged concept approved and added to KG",
		zap.String("concept_name", staged.ConceptName),
		zap.String("concept_id", newConcept.ID),
		zap.String("reviewer", reviewerID),
		zap.Int("prerequisite_count", len(staged.SuggestedPrerequisites)))

	return nil
}

func (s *queryService) RejectStagedConcept(ctx context.Context, stagedID string, reviewerID string, notes string) error {
	staged, err := s.stagedConceptRepo.FindByID(ctx, stagedID)
	if err != nil {
		return fmt.Errorf("failed to find staged concept: %w", err)
	}
	if staged == nil {
		return fmt.Errorf("staged concept not found")
	}

	if staged.Status != entities.StagedConceptStatusPending {
		return fmt.Errorf("concept has already been reviewed")
	}

	staged.Reject(reviewerID, notes)
	if err := s.stagedConceptRepo.Update(ctx, staged); err != nil {
		return fmt.Errorf("failed to update staged concept: %w", err)
	}

	s.logger.Info("Staged concept rejected",
		zap.String("concept_name", staged.ConceptName),
		zap.String("reviewer", reviewerID))

	return nil
}

func (s *queryService) MergeStagedConcept(ctx context.Context, stagedID string, existingConceptID string, reviewerID string, notes string) error {
	staged, err := s.stagedConceptRepo.FindByID(ctx, stagedID)
	if err != nil {
		return fmt.Errorf("failed to find staged concept: %w", err)
	}
	if staged == nil {
		return fmt.Errorf("staged concept not found")
	}

	if staged.Status != entities.StagedConceptStatusPending {
		return fmt.Errorf("concept has already been reviewed")
	}

	// Verify existing concept exists
	existingConcept, err := s.conceptRepo.GetConceptDetail(ctx, existingConceptID)
	if err != nil || existingConcept == nil {
		return fmt.Errorf("existing concept not found")
	}

	staged.Merge(reviewerID, notes, existingConceptID)
	if err := s.stagedConceptRepo.Update(ctx, staged); err != nil {
		return fmt.Errorf("failed to update staged concept: %w", err)
	}

	s.logger.Info("Staged concept merged with existing",
		zap.String("staged_concept", staged.ConceptName),
		zap.String("existing_concept", existingConcept.Concept.Name),
		zap.String("reviewer", reviewerID))

	return nil
}

func (s *queryService) GetStagedConceptStats(ctx context.Context) (*repositories.StagedConceptStats, error) {
	return s.stagedConceptRepo.GetStats(ctx)
}

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

// GetCachedConcepts returns a list of all cached concept queries for debugging
func (s *queryService) GetCachedConcepts(ctx context.Context, limit int) ([]entities.Query, error) {
	queries, err := s.queryRepo.FindByUserID(ctx, "", limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get cached concepts: %w", err)
	}

	result := make([]entities.Query, len(queries))
	for i, query := range queries {
		result[i] = *query
	}

	s.logger.Info("Retrieved cached concepts for debugging",
		zap.Int("count", len(result)))

	return result, nil
}

// ClearConceptCache removes old cached concept queries (for maintenance)
func (s *queryService) ClearConceptCache(ctx context.Context, olderThanDays int) error {
	cutoffDate := time.Now().AddDate(0, 0, -olderThanDays)

	// This would need to be implemented in the repository
	// For now, just log the request
	s.logger.Info("Concept cache clear requested",
		zap.Time("cutoff_date", cutoffDate),
		zap.Int("older_than_days", olderThanDays))

	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
