package llm

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/mathprereq/internal/core/config"
	"github.com/mathprereq/internal/types"
	"github.com/mathprereq/pkg/logger"
	"go.uber.org/zap"
	"google.golang.org/genai"
)

// Client represents a Gemini LLM client following best practices
type Client struct {
	genaiClient *genai.Client
	config      config.LLMConfig
	ctx         context.Context
	cancel      context.CancelFunc
	logger      *zap.Logger
}

// Default configuration constants
const (
	DefaultModel      = "gemini-2.0-flash-exp"
	DefaultMaxTokens  = 4000
	DefaultTimeout    = 60 * time.Second
	HealthCheckPrompt = "Respond with 'OK' to confirm you are working."
)

type ExplanationRequest struct {
	Query            string          `json:"query"`
	PrerequisitePath []types.Concept `json:"prerequisite_path"`
	ContextChunks    []string        `json:"context_chunks"`
}

func NewClient(cfg config.LLMConfig) (*Client, error) {
	logger := logger.MustGetLogger()
	logger.Info("Initializing Gemini LLM client",
		zap.String("model", cfg.Model),
		zap.Bool("api_key_provided", cfg.APIKey != ""))

	ctx, cancel := context.WithCancel(context.Background())

	// Get API key with fallback priority
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
		cancel()
		return nil, fmt.Errorf("Gemini API key not found. Set GEMINI_API_KEY, GOOGLE_API_KEY, or MLF_LLM_API_KEY environment variable")
	}

	// Initialize Gemini client with proper configuration
	genaiClient, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to initialize Gemini client: %w", err)
	}

	client := &Client{
		genaiClient: genaiClient,
		config:      cfg,
		ctx:         ctx,
		cancel:      cancel,
		logger:      logger,
	}

	logger.Info("Gemini LLM client initialized successfully",
		zap.String("model", cfg.Model),
		zap.String("provider", "gemini"))

	return client, nil
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

	response, err := c.callGemini(ctx, systemPrompt, userPrompt, 0.1)
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

	// Format context chunks
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

	response, err := c.callGemini(ctx, systemPrompt, userPrompt, 0.3)
	if err != nil {
		return "", fmt.Errorf("failed to generate explanation: %w", err)
	}

	c.logger.Info("Generated explanation successfully",
		zap.Int("explanation_length", len(response)),
		zap.Bool("appears_complete", !c.isResponseTruncated(response)))

	return response, nil
}

func (c *Client) Provider() string {
	return "gemini"
}

func (c *Client) Model() string {
	model := c.config.Model
	if model == "" {
		return DefaultModel
	}
	return model
}

func (c *Client) IsHealthy(ctx context.Context) bool {
	healthCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	_, err := c.callGemini(healthCtx, "You are a health check assistant.", HealthCheckPrompt, 0.1)
	if err != nil {
		c.logger.Warn("Gemini health check failed", zap.Error(err))
		return false
	}
	return true
}

func (c *Client) callGemini(ctx context.Context, systemPrompt, userPrompt string, temperature float32) (string, error) {
	// Use configured model or fallback
	model := c.config.Model
	if model == "" {
		model = DefaultModel
	}

	// Create the full prompt combining system and user prompts
	fullPrompt := systemPrompt + "\n\n" + userPrompt

	// Create generation config with proper validation
	maxTokens := c.config.MaxTokens
	if maxTokens <= 0 {
		maxTokens = DefaultMaxTokens
	}

	config := &genai.GenerateContentConfig{
		Temperature:     &temperature,
		MaxOutputTokens: int32(maxTokens),
	}

	// Generate content with timeout
	timeoutCtx, cancel := context.WithTimeout(ctx, DefaultTimeout)
	defer cancel()

	resp, err := c.genaiClient.Models.GenerateContent(timeoutCtx, model, genai.Text(fullPrompt), config)
	if err != nil {
		return "", fmt.Errorf("Gemini API call failed: %w", err)
	}

	// Validate response structure
	if resp == nil {
		return "", fmt.Errorf("received nil response from Gemini")
	}

	if len(resp.Candidates) == 0 {
		return "", fmt.Errorf("no candidates returned from Gemini")
	}

	candidate := resp.Candidates[0]
	if candidate.Content == nil {
		return "", fmt.Errorf("candidate has no content")
	}

	// Extract the text content
	var content strings.Builder
	for _, part := range candidate.Content.Parts {
		if part.Text != "" {
			content.WriteString(part.Text)
		}
	}

	result := strings.TrimSpace(content.String())
	if result == "" {
		return "", fmt.Errorf("no text content in Gemini response")
	}

	return result, nil
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

// Close gracefully shuts down the client
func (c *Client) Close() error {
	c.logger.Info("Closing Gemini LLM client")

	// Cancel the context to clean up any ongoing operations
	if c.cancel != nil {
		c.cancel()
	}

	// Wait briefly for graceful shutdown
	time.Sleep(100 * time.Millisecond)

	c.logger.Info("Gemini LLM client closed successfully")
	return nil
}
