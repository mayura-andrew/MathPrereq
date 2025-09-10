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

func (a *LLMAdapter) Provider() string {
	return a.client.Provider()
}

func (a *LLMAdapter) Model() string {
	return a.client.Model()
}

func (a *LLMAdapter) IsHealthy(ctx context.Context) bool {
	return a.client.IsHealthy(ctx)
}
