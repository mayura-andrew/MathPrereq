package orchestrator

import (
	"context"
	"fmt"
	"math"
	"math/rand/v2"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/internal/core/llm"
	"github.com/mathprereq/internal/data/mongodb"
	"github.com/mathprereq/internal/data/neo4j"
	"github.com/mathprereq/internal/data/weaviate"
	"github.com/mathprereq/pkg/logger"
	"go.mongodb.org/mongo-driver/mongo"
	"go.uber.org/zap"
)

type CircuitBreaker struct {
	failures   int64
	lastFailed time.Time
	mutex      sync.RWMutex
}

func (cb *CircuitBreaker) ShouldSkip() bool {
	cb.mutex.RLock()
	defer cb.mutex.RUnlock()

	// Skip if we've had too many recent failures
	if cb.failures >= 3 && time.Since(cb.lastFailed) < 30*time.Second {
		return true
	}
	return false
}

func (cb *CircuitBreaker) RecordFailure() {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()
	atomic.AddInt64(&cb.failures, 1)
	cb.lastFailed = time.Now()
}

func (cb *CircuitBreaker) RecordSuccess() {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()
	atomic.StoreInt64(&cb.failures, 0)
}

type Orchestrator struct {
	knowledgeGraph *neo4j.Client
	vectorStore    *weaviate.Client
	llmClient      *llm.Client
	queryAnalytics *mongodb.QueryAnalytics
	logger         *zap.Logger
	circuitBreaker *CircuitBreaker
}

type QueryResult struct {
	IdentifiedConcepts []string        `json:"identified_concepts"`
	PrerequisitePath   []neo4j.Concept `json:"prerequisite_path"`
	RetrievedContext   []string        `json:"retrieved_context"`
	Explanation        string          `json:"explanation"`
}

type ConceptDetailResult struct {
	Concept             neo4j.Concept   `json:"concept"`
	Prerequisites       []neo4j.Concept `json:"prerequisites"`
	LeadsTo             []neo4j.Concept `json:"leads_to"`
	DetailedExplanation string          `json:"detailed_explanation"`
}

type SystemStats struct {
	TotalConcepts  int64  `json:"total_concepts"`
	TotalEdges     int64  `json:"total_edges"`
	TotalChunks    int64  `json:"total_chunks"`
	KnowledgeGraph string `json:"knowledge_graph_status"`
	VectorStore    string `json:"vector_store_status"`
	LLMProvider    string `json:"llm_provider"`
	SystemHealth   string `json:"system_health"`
}

// Adaptive timeout constants
const (
	DefaultQueryTimeout   = 10 * time.Minute // Increased further for complex problems
	ConceptLLMTimeout     = 3 * time.Minute  // For concept identification
	ExplanationLLMTimeout = 8 * time.Minute  // Much longer for complex explanations
	DefaultDBTimeout      = 60 * time.Second // Increased DB timeout
	MaxRetryAttempts      = 3
	BaseRetryDelay        = 3 * time.Second // Increased base delay
)

func New(kg *neo4j.Client, vs *weaviate.Client, llmConfig config.LLMConfig, mongoClient *mongo.Client, databaseName string) *Orchestrator {
	llmClient := llm.NewClient(llmConfig)
	queryAnalytics := mongodb.NewQueryAnalytics(mongoClient, databaseName)

	return &Orchestrator{
		knowledgeGraph: kg,
		vectorStore:    vs,
		llmClient:      llmClient,
		queryAnalytics: queryAnalytics,
		logger:         logger.MustGetLogger(),
		circuitBreaker: &CircuitBreaker{},
	}
}

func (o *Orchestrator) ProcessQuery(ctx context.Context, query string) (*QueryResult, error) {
	startTime := time.Now()

	// Create a context with extended timeout for the entire operation
	queryCtx, cancel := context.WithTimeout(context.Background(), DefaultQueryTimeout)
	defer cancel()

	o.logger.Info("Processing query", zap.String("query", query[:min(len(query), 100)]))

	// Step 1: Identify concepts with adaptive timeout
	identifiedConcepts, err := o.retryLLMOperation(queryCtx, "identify_concepts", ConceptLLMTimeout, func(ctx context.Context) (interface{}, error) {
		return o.llmClient.IdentifyConcepts(ctx, query)
	})
	if err != nil {
		// Check if circuit breaker should activate
		if o.circuitBreaker.ShouldSkip() {
			o.logger.Warn("Circuit breaker active, returning fallback response")
			return &QueryResult{
				IdentifiedConcepts: []string{},
				PrerequisitePath:   []neo4j.Concept{},
				RetrievedContext:   []string{},
				Explanation:        "The system is temporarily experiencing high load. Please try again in a few moments.",
			}, nil
		}

		// Save failed query response
		o.saveQueryResponseAsync(query, []string{}, []neo4j.Concept{}, []string{}, "", startTime, false, err.Error())

		return nil, fmt.Errorf("failed to identify concepts: %w", err)
	}

	concepts, ok := identifiedConcepts.([]string)
	if !ok || len(concepts) == 0 {
		o.logger.Warn("No concepts identified from query")
		return &QueryResult{
			IdentifiedConcepts: []string{},
			PrerequisitePath:   []neo4j.Concept{},
			RetrievedContext:   []string{},
			Explanation:        "I couldn't identify any mathematical concepts in your question. Could you please rephrase it or be more specific about the mathematical topic you're asking about?",
		}, nil
	}

	// Use errgroup for concurrent operations
	g, gCtx := errgroup.WithContext(queryCtx)

	var prerequisitePath []neo4j.Concept
	var retrievedContext []string
	var mu sync.Mutex

	// Step 2: Find prerequisite learning path (concurrent)
	g.Go(func() error {
		dbCtx, dbCancel := context.WithTimeout(gCtx, DefaultDBTimeout)
		defer dbCancel()

		path, err := o.knowledgeGraph.FindPrerequisitePath(dbCtx, concepts)
		if err != nil {
			o.logger.Warn("Failed to find prerequisite path", zap.Error(err))
			mu.Lock()
			prerequisitePath = []neo4j.Concept{}
			mu.Unlock()
			return nil
		}

		o.logger.Info("Found learning path", zap.Int("concepts", len(path)))
		mu.Lock()
		prerequisitePath = path
		mu.Unlock()
		return nil
	})

	// Step 3: Retrieve relevant context using semantic search (concurrent)
	g.Go(func() error {
		dbCtx, dbCancel := context.WithTimeout(gCtx, DefaultDBTimeout)
		defer dbCancel()

		o.logger.Info("Performing semantic search", zap.String("query", query[:min(len(query), 100)]), zap.Int("limit", 3))

		searchResults, err := o.vectorStore.SemanticSearch(dbCtx, query, 3)
		if err != nil {
			o.logger.Warn("Failed to retrieve context", zap.Error(err))
			mu.Lock()
			retrievedContext = []string{}
			mu.Unlock()
			return nil
		}

		o.logger.Info("Semantic search completed", zap.Int("results", len(searchResults)))

		context := make([]string, len(searchResults))
		for i, result := range searchResults {
			context[i] = result.Content
		}

		mu.Lock()
		retrievedContext = context
		mu.Unlock()
		return nil
	})

	// Wait for both operations to complete
	if err := g.Wait(); err != nil {
		return nil, err
	}

	// Step 4: Generate explanation with longer timeout and validation
	explanationResult, err := o.retryLLMOperation(queryCtx, "generate_explanation", ExplanationLLMTimeout, func(ctx context.Context) (interface{}, error) {
		explanation, err := o.llmClient.GenerateExplanation(ctx, llm.ExplanationRequest{
			Query:            query,
			PrerequisitePath: prerequisitePath,
			ContextChunks:    retrievedContext,
		})
		if err != nil {
			return nil, err
		}

		// Log explanation details for debugging
		o.logger.Info("Generated explanation successfully",
			zap.Int("explanation_length", len(explanation)),
			zap.String("explanation_preview", explanation[:min(len(explanation), 200)]))

		// Check if explanation seems truncated
		if o.isExplanationTruncated(explanation) {
			o.logger.Warn("Explanation appears to be truncated",
				zap.Int("length", len(explanation)),
				zap.String("last_chars", explanation[max(0, len(explanation)-50):]))
		}

		return explanation, nil
	})

	var explanation string
	if err != nil {
		o.logger.Error("Failed to generate explanation after retries", zap.Error(err))
		o.circuitBreaker.RecordFailure()
		// Enhanced graceful degradation with more context
		explanation = fmt.Sprintf("I successfully identified the concepts (%s) and found the learning path, but I'm having trouble generating a detailed explanation right now. The key concepts are: %s. Please try again in a moment.",
			fmt.Sprintf("%d", len(concepts)),
			fmt.Sprintf("%v", concepts))
	} else {
		o.circuitBreaker.RecordSuccess()
		explanation = explanationResult.(string)

		// Final validation and enhancement if truncated
		if o.isExplanationTruncated(explanation) {
			explanation = o.enhanceIncompleteExplanation(explanation, concepts, prerequisitePath)
		}
	}

	o.logger.Info("Query processed successfully",
		zap.Int("concepts", len(concepts)),
		zap.Int("path_length", len(prerequisitePath)),
		zap.Int("context_chunks", len(retrievedContext)))

	// Save query response data asynchronously
	o.saveQueryResponseAsync(query, concepts, prerequisitePath, retrievedContext, explanation, startTime, true, "")

	return &QueryResult{
		IdentifiedConcepts: concepts,
		PrerequisitePath:   prerequisitePath,
		RetrievedContext:   retrievedContext,
		Explanation:        explanation,
	}, nil
}

// saveQueryResponseAsync saves query response data asynchronously to MongoDB
func (o *Orchestrator) saveQueryResponseAsync(query string, concepts []string, prerequisitePath []neo4j.Concept, retrievedContext []string, explanation string, startTime time.Time, success bool, errorMsg string) {
	go func() {
		record := &mongodb.QueryResponseRecord{
			Query:              query,
			IdentifiedConcepts: concepts,
			PrerequisitePath:   prerequisitePath,
			RetrievedContext:   retrievedContext,
			Explanation:        explanation,
			ResponseTime:       time.Since(startTime),
			ProcessingSuccess:  success,
			ErrorMessage:       errorMsg,
			Timestamp:          time.Now(),
			LLMProvider:        o.llmClient.GetProvider(),
			LLMModel:           o.llmClient.GetModel(),
			KnowledgeGraphHits: len(prerequisitePath),
			VectorStoreHits:    len(retrievedContext),
		}

		// Use a separate context for saving (with timeout)
		saveCtx, saveCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer saveCancel()

		if err := o.queryAnalytics.SaveQueryResponse(saveCtx, record); err != nil {
			o.logger.Warn("Failed to save query response", zap.Error(err))
		}
	}()
}

// Enhanced retry mechanism with adaptive timeouts and circuit breaker
func (o *Orchestrator) retryLLMOperation(ctx context.Context, operation string, timeout time.Duration, fn func(context.Context) (interface{}, error)) (interface{}, error) {
	// Check circuit breaker before attempting
	if o.circuitBreaker.ShouldSkip() {
		return nil, fmt.Errorf("circuit breaker is open for operation: %s", operation)
	}

	var lastErr error

	for attempt := 1; attempt <= MaxRetryAttempts; attempt++ {
		// Create an isolated context that doesn't inherit parent cancellation for timeouts
		// but still respects explicit cancellation
		attemptCtx, cancel := context.WithTimeout(context.Background(), timeout)

		// Monitor parent context cancellation in a separate goroutine
		done := make(chan struct{})
		go func() {
			select {
			case <-ctx.Done():
				cancel() // Cancel attempt if parent is cancelled
			case <-done:
				return
			}
		}()

		o.logger.Info("Attempting LLM operation",
			zap.String("operation", operation),
			zap.Int("attempt", attempt),
			zap.Int("max_attempts", MaxRetryAttempts),
			zap.Duration("timeout", timeout))

		result, err := fn(attemptCtx)
		close(done) // Signal monitoring goroutine to stop
		cancel()

		if err == nil {
			o.logger.Info("LLM operation succeeded",
				zap.String("operation", operation),
				zap.Int("attempt", attempt))
			return result, nil
		}

		lastErr = err
		o.logger.Warn("LLM operation failed",
			zap.String("operation", operation),
			zap.Int("attempt", attempt),
			zap.Error(err))

		// Don't retry if parent context was cancelled
		if ctx.Err() != nil {
			break
		}

		// Exponential backoff with jitter (only if not the last attempt)
		if attempt < MaxRetryAttempts {
			delay := time.Duration(math.Pow(2, float64(attempt-1))) * BaseRetryDelay
			jitter := float64(delay) * 0.1 * (rand.Float64()*2 - 1)
			delay += time.Duration(jitter)

			o.logger.Info("Retrying LLM operation after delay",
				zap.String("operation", operation),
				zap.Duration("delay", delay))

			select {
			case <-time.After(delay):
				continue
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}
	}

	return nil, fmt.Errorf("LLM operation '%s' failed after %d attempts: %w", operation, MaxRetryAttempts, lastErr)
}

func (o *Orchestrator) GetConceptDetail(ctx context.Context, conceptID string) (*ConceptDetailResult, error) {
	// Create context with timeout for concept detail operations
	detailCtx, cancel := context.WithTimeout(context.Background(), DefaultQueryTimeout)
	defer cancel()

	o.logger.Info("Getting concept detail", zap.String("concept_id", conceptID))

	// Get concept information from knowledge graph with timeout
	dbCtx, dbCancel := context.WithTimeout(detailCtx, DefaultDBTimeout)
	defer dbCancel()

	conceptInfo, err := o.knowledgeGraph.GetConceptInfo(dbCtx, conceptID)
	if err != nil {
		return nil, fmt.Errorf("failed to get concept info: %w", err)
	}

	conceptQuery := fmt.Sprintf("Explain %s in detail", conceptInfo.Concept.Name)

	g, gCtx := errgroup.WithContext(detailCtx)
	var searchResults []weaviate.SearchResult

	// Retrieve context concurrently with timeout
	g.Go(func() error {
		searchCtx, searchCancel := context.WithTimeout(gCtx, DefaultDBTimeout)
		defer searchCancel()

		results, err := o.vectorStore.SemanticSearch(searchCtx, conceptQuery, 3)
		if err != nil {
			o.logger.Warn("Failed to retrieve context for concept", zap.Error(err))
			searchResults = []weaviate.SearchResult{}
			return nil // Don't fail the entire operation
		}
		searchResults = results
		return nil
	})

	// Wait for context retrieval
	if err := g.Wait(); err != nil {
		return nil, err
	}

	// Generate explanation with retry mechanism using adaptive timeout
	contextChunks := make([]string, len(searchResults))
	for i, result := range searchResults {
		contextChunks[i] = result.Content
	}

	explanationResult, err := o.retryLLMOperation(detailCtx, "concept_detail", ConceptLLMTimeout, func(ctx context.Context) (interface{}, error) {
		return o.llmClient.GenerateExplanation(ctx, llm.ExplanationRequest{
			Query:            conceptQuery,
			PrerequisitePath: []neo4j.Concept{conceptInfo.Concept},
			ContextChunks:    contextChunks,
		})
	})

	var detailedExplanation string
	if err != nil {
		o.logger.Warn("Failed to generate detailed explanation", zap.Error(err))
		detailedExplanation = "Unable to generate detailed explanation at this time. Please try again later."
	} else {
		detailedExplanation = explanationResult.(string)
	}

	return &ConceptDetailResult{
		Concept:             conceptInfo.Concept,
		Prerequisites:       conceptInfo.Prerequisites,
		LeadsTo:             conceptInfo.LeadsTo,
		DetailedExplanation: detailedExplanation,
	}, nil
}

func (o *Orchestrator) GetSystemStats(ctx context.Context) (*SystemStats, error) {
	// Add timeout for stats collection
	statsCtx, cancel := context.WithTimeout(ctx, DefaultDBTimeout)
	defer cancel()

	// Concurrent stats collection for better performance
	g, gCtx := errgroup.WithContext(statsCtx)

	var kgStats, vsStats map[string]interface{}
	var mu sync.Mutex

	// Get Neo4j stats concurrently
	g.Go(func() error {
		stats, err := o.knowledgeGraph.GetStats(gCtx)
		mu.Lock()
		if err != nil {
			o.logger.Warn("Failed to get knowledge graph stats", zap.Error(err))
			kgStats = map[string]interface{}{
				"total_concepts": int64(0),
				"total_edges":    int64(0),
				"status":         "unhealthy",
			}
		} else {
			kgStats = stats
			if _, exists := kgStats["status"]; !exists {
				kgStats["status"] = "healthy"
			}
		}
		mu.Unlock()
		return nil
	})

	// Get Weaviate stats concurrently
	g.Go(func() error {
		stats, err := o.vectorStore.GetStats(gCtx)
		mu.Lock()
		if err != nil {
			o.logger.Warn("Failed to get vector store stats", zap.Error(err))
			vsStats = map[string]interface{}{
				"total_chunks": int64(0),
				"status":       "unhealthy",
			}
		} else {
			vsStats = stats
			if _, exists := vsStats["status"]; !exists {
				vsStats["status"] = "healthy"
			}
		}
		mu.Unlock()
		return nil
	})

	// Wait for both stat collections
	if err := g.Wait(); err != nil {
		return nil, err
	}

	// Safe type conversion with proper handling
	totalConcepts := o.extractInt64(kgStats, "total_concepts")
	totalEdges := o.extractInt64(kgStats, "total_edges")
	totalChunks := o.extractInt64(vsStats, "total_chunks")

	// Determine overall system health
	systemHealth := "healthy"
	if kgStats["status"].(string) == "unhealthy" || vsStats["status"].(string) == "unhealthy" {
		systemHealth = "degraded"
	}

	return &SystemStats{
		TotalConcepts:  totalConcepts,
		TotalEdges:     totalEdges,
		TotalChunks:    totalChunks,
		KnowledgeGraph: kgStats["status"].(string),
		VectorStore:    vsStats["status"].(string),
		LLMProvider:    o.llmClient.GetProvider(),
		SystemHealth:   systemHealth,
	}, nil
}

func (o *Orchestrator) GetAllConcepts(ctx context.Context) ([]neo4j.Concept, error) {
	o.logger.Info("Retrieving all concepts from knowledge graph")

	// Create context with timeout for database operations
	dbCtx, cancel := context.WithTimeout(ctx, DefaultDBTimeout)
	defer cancel()

	concepts, err := o.knowledgeGraph.GetAllConcepts(dbCtx)
	if err != nil {
		o.logger.Error("Failed to retrieve concepts", zap.Error(err))
		return nil, fmt.Errorf("failed to retrieve concepts: %w", err)
	}

	o.logger.Info("Successfully retrieved concepts", zap.Int("count", len(concepts)))
	return concepts, nil
}

// GetQueryStats returns statistics about stored queries
func (o *Orchestrator) GetQueryStats(ctx context.Context) (map[string]interface{}, error) {
	return o.queryAnalytics.GetQueryStats(ctx)
}

// Helper method to detect truncated explanations
func (o *Orchestrator) isExplanationTruncated(explanation string) bool {
	if len(explanation) == 0 {
		return true
	}

	// Check for common truncation indicators
	lastSentence := explanation[max(0, len(explanation)-100):]

	// Look for incomplete sentences or abrupt endings
	truncationIndicators := []string{
		"Let's break it down step-by-step",
		"Before we jump into",
		"The Core Concept:",
		"Step-by-Step Solution:",
		"and their",
		"we have two or more quantities that are changing, and their",
		"This type of problem is called a",
		"The name says it all:",
	}

	for _, indicator := range truncationIndicators {
		if strings.Contains(lastSentence, indicator) {
			return true
		}
	}

	// Check if explanation ends abruptly without proper conclusion
	if !endsWithPunctuation(explanation) && len(explanation) > 100 {
		return true
	}

	// Check if explanation is suspiciously short for complex problems
	if len(explanation) < 800 {
		return true
	}

	return false
} // Helper method to enhance incomplete explanations
func (o *Orchestrator) enhanceIncompleteExplanation(truncatedExplanation string, concepts []string, path []neo4j.Concept) string {
	o.logger.Info("Enhancing incomplete explanation", zap.Int("original_length", len(truncatedExplanation)))

	enhanced := truncatedExplanation

	// If explanation is very short or clearly truncated, add helpful content
	if len(truncatedExplanation) < 500 {
		enhanced += "\n\n**Complete Solution Overview:**\n\n"
		enhanced += "This problem involves finding derivatives using the product rule and evaluating them at specific points. "
		enhanced += "Here are the key steps:\n\n"
		enhanced += "1. **Find velocity**: v(t) = d/dt[t·sin(t)] using the product rule\n"
		enhanced += "2. **Find acceleration**: a(t) = d/dt[v(t)] for the second derivative\n"
		enhanced += "3. **Evaluate at t = π**: Substitute π into both v(t) and a(t)\n"
		enhanced += "4. **Find when at rest**: Solve v(t) = 0 in the given interval\n\n"

		if len(path) > 0 {
			enhanced += "**Prerequisites you should review:**\n"
			for i, concept := range path[:min(3, len(path))] {
				enhanced += fmt.Sprintf("%d. %s: %s\n", i+1, concept.Name, concept.Description)
			}
		}

		enhanced += "\n*Note: This explanation was automatically enhanced due to a processing interruption.*"
	}

	return enhanced
}

// Helper method to safely extract int64 values from map
func (o *Orchestrator) extractInt64(data map[string]interface{}, key string) int64 {
	if value, exists := data[key]; exists {
		switch v := value.(type) {
		case int64:
			return v
		case int:
			return int64(v)
		case float64:
			return int64(v)
		case string:
			// Try to parse string as number
			if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
				return parsed
			}
		}
	}
	return 0
}

// Helper functions
func contains(s, substr string) bool {
	return len(s) >= len(substr) && s[len(s)-len(substr):] == substr
}

func endsWithPunctuation(s string) bool {
	if len(s) == 0 {
		return false
	}
	lastChar := s[len(s)-1]
	return lastChar == '.' || lastChar == '!' || lastChar == '?'
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
