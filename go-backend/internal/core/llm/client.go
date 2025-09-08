package llm

import (
	"context"
	"fmt"
	"os"
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
	llm      llms.Model
	config   config.LLMConfig
	logger   *zap.Logger
	provider string
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

	var llmClient llms.Model
	var err error

	ctx := context.Background() // Add context

	switch cfg.Provider {
	case "gemini", "googleai":
		apiKey := "AIzaSyCH2RhInRfX8bsgvGGGcoAeVzIvSiIdbMY"
		if apiKey == "" {
			apiKey = os.Getenv("GEMINI_API_KEY")
		}
		if apiKey == "" {
			apiKey = os.Getenv("GOOGLE_API_KEY")
		}
		if apiKey == "" {
			apiKey = os.Getenv("MLF_LLM_API_KEY")
		}
		fmt.Print("This is LLM CLient api key")
		fmt.Println(apiKey)

		if apiKey == "" {
			logger.Fatal("Gemini API key not found",
				zap.String("provider", cfg.Provider),
				zap.String("suggestion", "Set GEMINI_API_KEY, GOOGLE_API_KEY, or MLF_LLM_API_KEY environment variable"))
		}

		llmClient, err = googleai.New(
			ctx,
			googleai.WithAPIKey(apiKey),
			googleai.WithDefaultModel(cfg.Model),
		)
		if err != nil {
			logger.Fatal("Failed to initialize Gemini client", zap.Error(err))
		}
		logger.Info("Initialized Gemini LLM client", zap.String("model", cfg.Model))

	case "openai":
		llmClient, err = openai.New(
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
		llm:      llmClient,
		config:   cfg,
		logger:   logger,
		provider: cfg.Provider,
	}
}

// Add the GetProvider method
func (c *Client) GetProvider() string {
	return c.provider
}

// You might also want to add other getter methods
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
	fmt.Println(concepts)
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
	// Don't create a new timeout context - respect the parent context timeout
	// The orchestrator already manages timeouts appropriately

	// Retry logic
	var lastErr error
	maxRetries := c.config.RetryAttempts
	if maxRetries == 0 {
		maxRetries = 3 // Default retry attempts
	}

	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			c.logger.Info("Retrying LLM call",
				zap.Int("attempt", attempt+1),
				zap.String("provider", c.config.Provider))

			// Exponential backoff with jitter
			backoffDuration := time.Duration(attempt) * 2 * time.Second
			select {
			case <-time.After(backoffDuration):
			case <-ctx.Done():
				return "", ctx.Err()
			}
		}

		c.logger.Info("LLM call starting",
			zap.Int("attempt", attempt+1),
			zap.String("provider", c.config.Provider),
			zap.String("model", c.config.Model))

		messages := []llms.MessageContent{
			llms.TextParts(llms.ChatMessageTypeSystem, systemPrompt),
			llms.TextParts(llms.ChatMessageTypeHuman, userPrompt),
		}

		// Configure options based on provider with higher token limits
		var options []llms.CallOption
		options = append(options, llms.WithTemperature(float64(temperature)))

		// Set appropriate max tokens for complete responses
		if c.config.Provider == "gemini" || c.config.Provider == "googleai" {
			maxTokens := c.config.MaxTokens
			if maxTokens == 0 {
				maxTokens = 8192 // Higher default for Gemini to avoid truncation
			}
			options = append(options, llms.WithMaxTokens(maxTokens))
		} else {
			maxTokens := c.config.MaxTokens
			if maxTokens == 0 {
				maxTokens = 4096 // Higher default for OpenAI
			}
			options = append(options, llms.WithMaxTokens(maxTokens))
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
			c.logger.Warn("Empty response from LLM",
				zap.Int("attempt", attempt+1),
				zap.String("provider", c.config.Provider))
			continue
		}

		responseContent := response.Choices[0].Content
		responseLength := len(responseContent)

		c.logger.Info("LLM call successful",
			zap.String("provider", c.config.Provider),
			zap.String("model", c.config.Model),
			zap.Int("attempt", attempt+1),
			zap.Int("response_length", responseLength),
			zap.String("response_preview", responseContent[:min(200, responseLength)]))

		// Check if response seems truncated and warn
		if c.isResponseTruncated(responseContent) {
			c.logger.Warn("LLM response may be truncated",
				zap.Int("response_length", responseLength),
				zap.String("last_50_chars", responseContent[max(0, responseLength-50):]))
		}

		return responseContent, nil
	}

	return "", fmt.Errorf("LLM call failed after %d attempts: %w", maxRetries, lastErr)
}

// Helper method to detect truncated responses
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

// Helper functions
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
