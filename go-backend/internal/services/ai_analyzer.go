// DEPRECATED: This file is deprecated. Use video_analyzer.go instead.
// Kept for backward compatibility only.

package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/mathprereq/internal/data/scraper"
	"github.com/mathprereq/pkg/logger"
	"go.uber.org/zap"
)

// VideoAnalysis represents AI-generated analysis of a video
type VideoAnalysis struct {
	VideoID            string   `json:"video_id"`
	VideoTitle         string   `json:"video_title"`
	Summary            string   `json:"summary"`
	Prerequisites      []string `json:"prerequisites"`
	KeyConcepts        []string `json:"key_concepts"`
	DifficultyLevel    string   `json:"difficulty_level"`
	EstimatedTime      string   `json:"estimated_time"`
	LearningObjectives []string `json:"learning_objectives,omitempty"`
}

// AIAnalyzer provides AI-powered analysis of educational resources
type AIAnalyzer struct {
	llmClient LLMClient
	logger    *zap.Logger
}

// LLMClient interface for AI model interactions
type LLMClient interface {
	GenerateCompletion(ctx context.Context, prompt string) (string, error)
}

// NewAIAnalyzer creates a new AI analyzer instance
func NewAIAnalyzer(llmClient LLMClient) *AIAnalyzer {
	return &AIAnalyzer{
		llmClient: llmClient,
		logger:    logger.MustGetLogger(),
	}
}

// AnalyzeVideo analyzes a video resource using its transcript
func (a *AIAnalyzer) AnalyzeVideo(ctx context.Context, resource *scraper.EducationalResource) (*VideoAnalysis, error) {
	if resource.Transcript == nil || *resource.Transcript == "" {
		return nil, fmt.Errorf("no transcript available for video")
	}

	transcript := *resource.Transcript

	// Truncate transcript if too long (keep first 4000 chars for context)
	if len(transcript) > 4000 {
		transcript = transcript[:4000] + "..."
	}

	// Generate analysis using LLM
	analysis, err := a.generateAnalysis(ctx, resource.Title, transcript)
	if err != nil {
		return nil, fmt.Errorf("failed to generate analysis: %w", err)
	}

	videoID := ""
	if resource.VideoID != nil {
		videoID = *resource.VideoID
	}

	analysis.VideoID = videoID
	analysis.VideoTitle = resource.Title

	a.logger.Info("Generated video analysis",
		zap.String("video_id", videoID),
		zap.Int("prerequisites", len(analysis.Prerequisites)),
		zap.Int("key_concepts", len(analysis.KeyConcepts)))

	return analysis, nil
}

// generateAnalysis uses LLM to analyze video content
func (a *AIAnalyzer) generateAnalysis(ctx context.Context, title, transcript string) (*VideoAnalysis, error) {
	prompt := fmt.Sprintf(`Analyze this educational mathematics video and provide a structured analysis.

Video Title: %s

Transcript:
%s

Please provide a JSON response with the following structure:
{
  "summary": "A concise 2-3 sentence summary of what the video teaches",
  "prerequisites": ["List of prerequisite mathematical concepts needed to understand this video"],
  "key_concepts": ["Main concepts covered in this video"],
  "difficulty_level": "beginner|intermediate|advanced",
  "estimated_time": "Estimated time to understand (e.g., '30 minutes')",
  "learning_objectives": ["What students will learn from this video"]
}

Requirements:
- Prerequisites should be specific mathematical concepts (e.g., "Basic Algebra", "Derivative Rules")
- Key concepts should be the main topics covered
- Be concise and accurate
- Focus on mathematical prerequisites only

Respond with only valid JSON, no additional text.`, title, transcript)

	response, err := a.llmClient.GenerateCompletion(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("LLM generation failed: %w", err)
	}

	// Parse JSON response
	var analysis VideoAnalysis

	// Clean response (remove markdown code blocks if present)
	response = strings.TrimSpace(response)
	response = strings.TrimPrefix(response, "```json")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	if err := json.Unmarshal([]byte(response), &analysis); err != nil {
		a.logger.Error("Failed to parse LLM response", zap.Error(err), zap.String("response", response))

		// Fallback: create basic analysis from transcript
		return a.createFallbackAnalysis(title, transcript), nil
	}

	return &analysis, nil
}

// createFallbackAnalysis creates a basic analysis when LLM fails
func (a *AIAnalyzer) createFallbackAnalysis(title, transcript string) *VideoAnalysis {
	// Extract basic info from title and transcript
	summary := fmt.Sprintf("This video covers: %s", title)
	if len(transcript) > 200 {
		summary = transcript[:200] + "..."
	}

	// Extract potential concepts from title
	concepts := a.extractConceptsFromText(title)
	if len(concepts) == 0 {
		concepts = []string{"Mathematics"}
	}

	return &VideoAnalysis{
		Summary:            summary,
		Prerequisites:      []string{"Basic Mathematics"},
		KeyConcepts:        concepts,
		DifficultyLevel:    "intermediate",
		EstimatedTime:      "30 minutes",
		LearningObjectives: []string{"Understand " + title},
	}
}

// extractConceptsFromText extracts mathematical concepts from text
func (a *AIAnalyzer) extractConceptsFromText(text string) []string {
	text = strings.ToLower(text)

	concepts := []string{}
	mathTerms := []string{
		"derivative", "integral", "limit", "function", "calculus",
		"algebra", "trigonometry", "geometry", "equation", "theorem",
		"proof", "matrix", "vector", "polynomial", "exponential",
	}

	for _, term := range mathTerms {
		if strings.Contains(text, term) {
			concepts = append(concepts, strings.Title(term))
		}
	}

	return concepts
}
