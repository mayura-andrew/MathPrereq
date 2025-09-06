package orchestrator

import (
	"context"
	"fmt"

	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/internal/core/llm"
	"github.com/mathprereq/internal/data/neo4j"
	"github.com/mathprereq/internal/data/weaviate"
	"github.com/mathprereq/pkg/logger"
	"go.uber.org/zap"
)

type Orchestrator struct {
	knowledgeGraph *neo4j.Client
	vectorStore    *weaviate.Client
	llmClient      *llm.Client
	logger         *zap.Logger
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
	TotalConcepts int `json:"total_concepts"`
	TotalChunks   int `json:"total_chunks"`
}

func New(kg *neo4j.Client, vs *weaviate.Client, llmConfig config.LLMConfig) *Orchestrator {
	llmClient := llm.NewClient(llmConfig)

	return &Orchestrator{
		knowledgeGraph: kg,
		vectorStore:    vs,
		llmClient:      llmClient,
		logger:         logger.MustGetLogger(),
	}
}

func (o *Orchestrator) ProcessQuery(ctx context.Context, query string) (*QueryResult, error) {
	o.logger.Info("Processing query", zap.String("query", query[:min(len(query), 100)]))

	// Step 1: Identify concepts from the query
	identifiedConcepts, err := o.llmClient.IdentifyConcepts(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to identify concepts: %w", err)
	}

	if len(identifiedConcepts) == 0 {
		o.logger.Warn("No concepts identified from query")
		return &QueryResult{
			IdentifiedConcepts: []string{},
			PrerequisitePath:   []neo4j.Concept{},
			RetrievedContext:   []string{},
			Explanation:        "I couldn't identify any mathematical concepts in your question. Could you please rephrase it or be more specific about the mathematical topic you're asking about?",
		}, nil
	}

	// Step 2: Find prerequisite learning path
	prerequisitePath, err := o.knowledgeGraph.FindPrerequisitePath(ctx, identifiedConcepts)
	if err != nil {
		return nil, fmt.Errorf("failed to find prerequisite path: %w", err)
	}

	// Step 3: Retrieve relevant context using semantic search
	searchResults, err := o.vectorStore.SemanticSearch(ctx, query, 3)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve context: %w", err)
	}

	retrievedContext := make([]string, len(searchResults))
	for i, result := range searchResults {
		retrievedContext[i] = result.Content
	}

	// Step 4: Generate explanation using LLM with RAG
	explanation, err := o.llmClient.GenerateExplanation(ctx, llm.ExplanationRequest{
		Query:            query,
		PrerequisitePath: prerequisitePath,
		ContextChunks:    retrievedContext,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate explanation: %w", err)
	}

	o.logger.Info("Query processed successfully",
		zap.Int("concepts", len(identifiedConcepts)),
		zap.Int("path_length", len(prerequisitePath)),
		zap.Int("context_chunks", len(retrievedContext)))

	return &QueryResult{
		IdentifiedConcepts: identifiedConcepts,
		PrerequisitePath:   prerequisitePath,
		RetrievedContext:   retrievedContext,
		Explanation:        explanation,
	}, nil
}

func (o *Orchestrator) GetConceptDetail(ctx context.Context, conceptID string) (*ConceptDetailResult, error) {
	o.logger.Info("Getting concept detail", zap.String("concept_id", conceptID))

	// Get concept information from knowledge graph
	conceptInfo, err := o.knowledgeGraph.GetConceptInfo(ctx, conceptID)
	if err != nil {
		return nil, fmt.Errorf("failed to get concept info: %w", err)
	}

	// Generate detailed explanation for this concept
	conceptQuery := fmt.Sprintf("Explain %s in detail", conceptInfo.Concept.Name)

	searchResults, err := o.vectorStore.SemanticSearch(ctx, conceptQuery, 3)
	if err != nil {
		o.logger.Warn("Failed to retrieve context for concept", zap.Error(err))
		searchResults = []weaviate.SearchResult{}
	}

	contextChunks := make([]string, len(searchResults))
	for i, result := range searchResults {
		contextChunks[i] = result.Content
	}

	detailedExplanation, err := o.llmClient.GenerateExplanation(ctx, llm.ExplanationRequest{
		Query:            conceptQuery,
		PrerequisitePath: []neo4j.Concept{conceptInfo.Concept},
		ContextChunks:    contextChunks,
	})
	if err != nil {
		o.logger.Warn("Failed to generate detailed explanation", zap.Error(err))
		detailedExplanation = "Unable to generate detailed explanation at this time."
	}

	return &ConceptDetailResult{
		Concept:             conceptInfo.Concept,
		Prerequisites:       conceptInfo.Prerequisites,
		LeadsTo:             conceptInfo.LeadsTo,
		DetailedExplanation: detailedExplanation,
	}, nil
}

func (o *Orchestrator) GetAllConcepts(ctx context.Context) ([]neo4j.Concept, error) {
	return o.knowledgeGraph.GetAllConcepts(ctx)
}

func (o *Orchestrator) IsKnowledgeGraphHealthy(ctx context.Context) bool {
	return o.knowledgeGraph.IsHealthy(ctx)
}

func (o *Orchestrator) IsVectorStoreHealthy(ctx context.Context) bool {
	return o.vectorStore.IsHealthy(ctx)
}

func (o *Orchestrator) GetSystemStats(ctx context.Context) (*SystemStats, error) {
	kgStats, err := o.knowledgeGraph.GetStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get knowledge graph stats: %w", err)
	}

	vsStats, err := o.vectorStore.GetStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get vector store stats: %w", err)
	}

	return &SystemStats{
		TotalConcepts: kgStats["total_concepts"].(int),
		TotalChunks:   vsStats["total_chunks"].(int),
	}, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
