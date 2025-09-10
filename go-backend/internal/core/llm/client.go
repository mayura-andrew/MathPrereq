package llm

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/internal/data/neo4j"
	"github.com/mathprereq/pkg/logger"
	"go.uber.org/zap"
	"google.golang.org/genai"
)

type Client struct {
	genaiClient *genai.Client
	config      config.LLMConfig
	logger      *zap.Logger
	provider    string
}

type ExplanationRequest struct {
	Query            string          `json:"query"`
	PrerequisitePath []neo4j.Concept `json:"prerequisite_path"`
	ContextChunks    []string        `json:"context_chunks"`
}

func NewClient(cfg config.LLMConfig) *Client {
	logger := logger.MustGetLogger()
	logger.Info("Initializing LLM client",
		zap.String("provider", cfg.Provider),
		zap.String("model", cfg.Model),
		zap.Bool("api_key_provided", cfg.APIKey != ""))

	var genaiClient *genai.Client
	var err error
	ctx := context.Background()

	switch cfg.Provider {
	case "gemini", "googleai":
		apiKey := cfg.APIKey
		if apiKey == "" {
			apiKey = os.Getenv("GEMINI_API_KEY")
		}
		if apiKey == "" {
			apiKey = os.Getenv("GOOGLE_API_KEY")
		}
		if apiKey == "" {
			apiKey = os.Getenv("MLF_LLM_API_KEY")
		}
		if apiKey == "" {
			logger.Fatal("Gemini API key not found",
				zap.String("provider", cfg.Provider),
				zap.String("suggestion", "Set GEMINI_API_KEY, GOOGLE_API_KEY, or MLF_LLM_API_KEY environment variable"))
		}

		clientConfig := &genai.ClientConfig{
			APIKey: apiKey,
		}
		genaiClient, err = genai.NewClient(ctx, clientConfig)
		if err != nil {
			logger.Fatal("Failed to initialize Gemini GenAI client", zap.Error(err))
		}
		logger.Info("Initialized Gemini GenAI client", zap.String("model", cfg.Model))

	default:
		logger.Fatal("Unsupported LLM provider", zap.String("provider", cfg.Provider))
	}

	return &Client{
		genaiClient: genaiClient,
		config:      cfg,
		logger:      logger,
		provider:    cfg.Provider,
	}
}

func (c *Client) GetProvider() string {
	return c.provider
}

func (c *Client) GetModel() string {
	return c.config.Model
}

func (c *Client) GetConfig() config.LLMConfig {
	return c.config
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

	systemPrompt := `You are an expert mathematics tutor specializing in calculus. Your goal is to provide clear, complete, educational explanations that help students understand mathematical concepts and their prerequisites.

	Guidelines:
	1. Start with the fundamental concepts and build up logically
	2. Explain WHY prerequisites are needed, not just WHAT they are
	3. Use clear, accessible language but maintain mathematical accuracy
	4. Include specific step-by-step solutions with calculations
	5. Address the student's specific question directly
	6. Always provide a COMPLETE explanation - do not truncate your response
	7. Use the provided context and learning path to ground your explanation
	8. End with a clear conclusion or final answer

	IMPORTANT: Provide a complete, thorough explanation. Do not stop mid-sentence or leave the explanation incomplete.`

	userPrompt := fmt.Sprintf(`Student Question: %s

	%sRelevant Course Material:
	%s

	Please provide a complete, educational explanation that:
	1. Addresses the student's question directly
	2. Explains any necessary prerequisite concepts
	3. Shows step-by-step solution with calculations
	4. Shows how the concepts connect to each other
	5. Provides the final numerical answer if applicable
	6. Includes practical guidance for learning

	Make sure to provide a COMPLETE response that fully answers the question.

	Explanation:`, req.Query, pathText, contextText)

	response, err := c.callLLM(ctx, systemPrompt, userPrompt, 0.3)
	if err != nil {
		return "", fmt.Errorf("failed to generate explanation: %w", err)
	}

	c.logger.Info("Generated explanation successfully",
		zap.Int("explanation_length", len(response)),
		zap.Bool("appears_complete", !c.isResponseTruncated(response)))

	return response, nil
}

func (c *Client) callLLM(ctx context.Context, systemPrompt, userPrompt string, temperature float32) (string, error) {
	// Gemini/GenAI logic using the correct API
	model := c.config.Model
	if model == "" {
		model = "gemini-2.0-flash-exp" // fallback
	}

	// Create the full prompt combining system and user prompts
	fullPrompt := systemPrompt + "\n\n" + userPrompt

	// Create content using genai.Text
	contents := genai.Text(fullPrompt)

	// Create generation config
	config := &genai.GenerateContentConfig{
		Temperature:     &temperature,
		MaxOutputTokens: int32(c.config.MaxTokens),
	}

	// Generate content with proper parameters
	resp, err := c.genaiClient.Models.GenerateContent(ctx, model, contents, config)
	if err != nil {
		return "", fmt.Errorf("Gemini LLM call failed: %w", err)
	}

	// Extract response
	if len(resp.Candidates) == 0 {
		return "", fmt.Errorf("No candidates returned from Gemini")
	}

	// Extract the text content
	var content string
	if resp.Candidates[0].Content != nil {
		for _, part := range resp.Candidates[0].Content.Parts {
			if part.Text != "" {
				content += part.Text
			}
		}
	}

	if content == "" {
		return "", fmt.Errorf("No text content in Gemini response")
	}

	return content, nil
}

func (c *Client) isResponseTruncated(response string) bool {
	if len(response) == 0 {
		return true
	}

	// Check if response ends abruptly without proper punctuation
	lastChar := response[len(response)-1]
	if lastChar != '.' && lastChar != '!' && lastChar != '?' && lastChar != '\n' {
		return true
	}

	// Check for common truncation patterns
	truncationIndicators := []string{
		" and their",
		" is a",
		" we can",
		" the ",
		" this ",
	}

	for _, indicator := range truncationIndicators {
		if strings.HasSuffix(response, indicator) {
			return true
		}
	}

	return false
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
