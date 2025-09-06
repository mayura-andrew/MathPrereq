package llm

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/internal/data/neo4j"
	"github.com/mathprereq/pkg/logger"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/googleai"
	"github.com/tmc/langchaingo/llms/openai"
	"go.uber.org/zap"
)

type Client struct {
	llm    llms.Model
	config config.LLMConfig
	logger *zap.Logger
}

type ExplanationRequest struct {
	Query            string          `json:"query"`
	PrerequisitePath []neo4j.Concept `json:"prerequisite_path"`
	ContextChunks    []string        `json:"context_chunks"`
}

func NewClient(cfg config.LLMConfig) *Client {
    logger := logger.MustGetLogger()

    var llm llms.Model
    var err error

    ctx := context.Background() // Add context

    switch cfg.Provider {
    case "gemini", "googleai":
        llm, err = googleai.New(
            ctx,
            googleai.WithAPIKey(cfg.APIKey),
            googleai.WithDefaultModel(cfg.Model),
        )
        if err != nil {
            logger.Fatal("Failed to initialize Gemini client", zap.Error(err))
        }
        logger.Info("Initialized Gemini LLM client", zap.String("model", cfg.Model))

    case "openai":
        llm, err = openai.New(
            openai.WithToken(cfg.APIKey),
            openai.WithModel(cfg.Model),
        )
        if err != nil {
            logger.Fatal("Failed to initialize OpenAI client", zap.Error(err))
        }
        logger.Info("Initialized OpenAI LLM client", zap.String("model", cfg.Model))

    default:
        logger.Fatal("Unsupported LLM provider", zap.String("provider", cfg.Provider))
    }

    return &Client{
        llm:    llm,
        config: cfg,
        logger: logger,
    }
}

func (c *Client) IdentifyConcepts(ctx context.Context, query string) ([]string, error) {
	systemPrompt := `You are an expert in mathematics education. Your task is to identify the key mathematical concepts mentioned in a student's query.

	Rules:
	1. Extract only the core mathematical concepts (not general words)
	2. Return concepts that would appear in a calculus curriculum
	3. Format as a comma-separated list
	4. Be precise and use standard mathematical terminology
	5. Focus on concepts that would have prerequisite relationships

	Examples:
	Query: "I don't understand how to find the derivative of x^2"
	Response: derivatives, power rule

	Query: "What is integration by parts and when do I use it?"
	Response: integration, integration by parts

	Query: "I'm confused about limits and continuity"
	Response: limits, continuity`

	userPrompt := fmt.Sprintf("Student query: '%s'\n\nIdentified concepts:", query)

	response, err := c.callLLM(ctx, systemPrompt, userPrompt, 0.1)
	if err != nil {
		return nil, fmt.Errorf("failed to identify concepts: %w", err)
	}

	concepts := strings.Split(strings.TrimSpace(response), ",")
	var cleanedConcepts []string
	for _, concept := range concepts {
		cleaned := strings.TrimSpace(concept)
		if cleaned != "" {
			cleanedConcepts = append(cleanedConcepts, cleaned)
		}
	}

	c.logger.Info("Identified concepts", zap.Strings("concepts", cleanedConcepts))
	return cleanedConcepts, nil
}

func (c *Client) GenerateExplanation(ctx context.Context, req ExplanationRequest) (string, error) {
	// Format prerequisite path
	pathText := ""
	if len(req.PrerequisitePath) > 0 {
		pathConcepts := make([]string, len(req.PrerequisitePath))
		for i, concept := range req.PrerequisitePath {
			pathConcepts[i] = concept.Name
		}
		pathText = fmt.Sprintf("Learning path: %s\n\n", strings.Join(pathConcepts, " → "))
	}

	contextText := ""
	if len(req.ContextChunks) > 0 {
		contextParts := make([]string, len(req.ContextChunks))
		for i, chunk := range req.ContextChunks {
			contextParts[i] = fmt.Sprintf("Context %d: %s", i+1, chunk)
		}
		contextText = strings.Join(contextParts, "\n\n")
	}

	systemPrompt := `You are an expert mathematics tutor specializing in calculus. Your goal is to provide clear, educational explanations that help students understand mathematical concepts and their prerequisites.

	Guidelines:
	1. Start with the fundamental concepts and build up logically
	2. Explain WHY prerequisites are needed, not just WHAT they are
	3. Use clear, accessible language but maintain mathematical accuracy
	4. Include specific examples when helpful
	5. Address the student's specific question directly
	6. Keep explanations focused and not too lengthy
	7. Use the provided context and learning path to ground your explanation`

	userPrompt := fmt.Sprintf(`Student Question: %s

	%sRelevant Course Material:
	%s

	Please provide a clear, educational explanation that:
	1. Addresses the student's question directly
	2. Explains any necessary prerequisite concepts
	3. Shows how the concepts connect to each other
	4. Provides practical guidance for learning

	Explanation:`, req.Query, pathText, contextText)

	response, err := c.callLLM(ctx, systemPrompt, userPrompt, 0.3)
	if err != nil {
		return "", fmt.Errorf("failed to generate explanation: %w", err)
	}

	c.logger.Info("Generated explanation successfully")
	return response, nil
}

func (c *Client) callLLM(ctx context.Context, systemPrompt, userPrompt string, temperature float32) (string, error) {
	// Create context with timeout
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Retry logic
	var lastErr error
	for attempt := 0; attempt < c.config.RetryAttempts; attempt++ {
		if attempt > 0 {
			c.logger.Info("Retrying LLM call",
				zap.Int("attempt", attempt+1),
				zap.String("provider", c.config.Provider))
			time.Sleep(time.Duration(attempt) * time.Second)
		}

		messages := []llms.MessageContent{
			llms.TextParts(llms.ChatMessageTypeSystem, systemPrompt),
			llms.TextParts(llms.ChatMessageTypeHuman, userPrompt),
		}

		// Configure options based on provider
		var options []llms.CallOption
		options = append(options, llms.WithTemperature(float64(temperature)))

		// Gemini has different token limits than OpenAI
		if c.config.Provider == "gemini" || c.config.Provider == "googleai" {
			// Gemini models have higher token limits
			maxTokens := c.config.MaxTokens
			if maxTokens == 0 {
				maxTokens = 8192 // Default for Gemini
			}
			options = append(options, llms.WithMaxTokens(maxTokens))
		} else {
			options = append(options, llms.WithMaxTokens(c.config.MaxTokens))
		}

		response, err := c.llm.GenerateContent(ctx, messages, options...)

		if err != nil {
			lastErr = err
			c.logger.Warn("LLM call failed",
				zap.Error(err),
				zap.Int("attempt", attempt+1),
				zap.String("provider", c.config.Provider))
			continue
		}

		if len(response.Choices) == 0 {
			lastErr = fmt.Errorf("no response choices returned")
			continue
		}

		c.logger.Debug("LLM call successful",
			zap.String("provider", c.config.Provider),
			zap.String("model", c.config.Model),
			zap.Int("response_length", len(response.Choices[0].Content)))

		return response.Choices[0].Content, nil
	}

	return "", fmt.Errorf("LLM call failed after %d attempts: %w", c.config.RetryAttempts, lastErr)
}
