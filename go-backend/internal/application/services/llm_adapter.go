package services

import (
	"context"

	"github.com/mathprereq/internal/core/llm"
)

// LLMAdapter adapts the core LLM client to the service interface
type LLMAdapter struct {
	client *llm.Client
}

func NewLLMAdapter(client *llm.Client) LLMClient {
	return &LLMAdapter{client: client}
}

func (a *LLMAdapter) IdentifyConcepts(ctx context.Context, query string) ([]string, error) {
	return a.client.IdentifyConcepts(ctx, query)
}

func (a *LLMAdapter) GenerateExplanation(ctx context.Context, req ExplanationRequest) (string, error) {
	// Convert service ExplanationRequest to llm.ExplanationRequest
	llmReq := llm.ExplanationRequest{
		Query:            req.Query,
		PrerequisitePath: req.PrerequisitePath,
		ContextChunks:    req.ContextChunks,
	}
	return a.client.GenerateExplanation(ctx, llmReq)
}

func (a *LLMAdapter) AnalyzeNewConcept(ctx context.Context, conceptName string, queryContext string) (*NewConceptAnalysis, error) {
	// Call the LLM client's AnalyzeNewConcept method
	analysis, err := a.client.AnalyzeNewConcept(ctx, conceptName, queryContext)
	if err != nil {
		return nil, err
	}

	// Convert llm.NewConceptAnalysis to service.NewConceptAnalysis
	return &NewConceptAnalysis{
		ConceptName:         analysis.ConceptName,
		Description:         analysis.Description,
		SuggestedPrereqs:    analysis.SuggestedPrereqs,
		SuggestedDifficulty: analysis.SuggestedDifficulty,
		SuggestedCategory:   analysis.SuggestedCategory,
		Reasoning:           analysis.Reasoning,
		IsLikelyNewConcept:  analysis.IsLikelyNewConcept,
	}, nil
}

func (a *LLMAdapter) Provider() string {
	return a.client.Provider()
}

func (a *LLMAdapter) Model() string {
	return a.client.Model()
}

func (a *LLMAdapter) IsHealthy(ctx context.Context) bool {
	return a.client.IsHealthy(ctx)
}
