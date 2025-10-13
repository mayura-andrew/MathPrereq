package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/mathprereq/internal/data/scraper"
	"github.com/mathprereq/pkg/llm"
	"github.com/mathprereq/pkg/logger"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.uber.org/zap"
)

// VideoAnalysis represents AI-generated analysis of a video
type VideoAnalysis struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ResourceID         primitive.ObjectID `bson:"resource_id" json:"resource_id"`
	VideoID            string             `bson:"video_id" json:"video_id"`
	VideoTitle         string             `bson:"video_title" json:"video_title"`
	Summary            string             `bson:"summary" json:"summary"`
	Prerequisites      []string           `bson:"prerequisites" json:"prerequisites"`
	KeyConcepts        []string           `bson:"key_concepts" json:"key_concepts"`
	DifficultyLevel    string             `bson:"difficulty_level" json:"difficulty_level"`
	EstimatedTime      string             `bson:"estimated_time" json:"estimated_time"`
	LearningObjectives []string           `bson:"learning_objectives" json:"learning_objectives"`
	AnalyzedAt         time.Time          `bson:"analyzed_at" json:"analyzed_at"`
	TranscriptLength   int                `bson:"transcript_length" json:"transcript_length"`
	Status             string             `bson:"status" json:"status"` // pending, completed, failed
	ErrorMessage       string             `bson:"error_message,omitempty" json:"error_message,omitempty"`
}

// VideoAnalyzerService handles video analysis operations
type VideoAnalyzerService struct {
	scraper            *scraper.EducationalWebScraper
	llmClient          *llm.GeminiClient
	analysisCollection *mongo.Collection
	logger             *zap.Logger
	mu                 sync.RWMutex
	activeAnalyses     map[string]bool // Track ongoing analyses
}

// NewVideoAnalyzerService creates a new video analyzer service
func NewVideoAnalyzerService(
	scraper *scraper.EducationalWebScraper,
	llmClient *llm.GeminiClient,
	mongoClient *mongo.Client,
	dbName string,
) *VideoAnalyzerService {
	collection := mongoClient.Database(dbName).Collection("video_analyses")

	// Create indexes
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{"resource_id", 1}},
		},
		{
			Keys: bson.D{{"video_id", 1}},
		},
		{
			Keys: bson.D{{"analyzed_at", -1}},
		},
	}

	if _, err := collection.Indexes().CreateMany(ctx, indexes); err != nil {
		logger.MustGetLogger().Warn("Failed to create video analysis indexes", zap.Error(err))
	}

	return &VideoAnalyzerService{
		scraper:            scraper,
		llmClient:          llmClient,
		analysisCollection: collection,
		logger:             logger.MustGetLogger(),
		activeAnalyses:     make(map[string]bool),
	}
}

// AnalyzeVideoResource analyzes a video resource by ID
func (s *VideoAnalyzerService) AnalyzeVideoResource(ctx context.Context, resourceID primitive.ObjectID) (*VideoAnalysis, error) {
	// Check if analysis already exists
	existingAnalysis, err := s.GetAnalysisByResourceID(ctx, resourceID)
	if err == nil && existingAnalysis != nil {
		// Return cached analysis if it's recent (within 7 days)
		if time.Since(existingAnalysis.AnalyzedAt) < 7*24*time.Hour {
			s.logger.Info("Returning cached analysis", zap.String("resource_id", resourceID.Hex()))
			return existingAnalysis, nil
		}
	}

	// Get resource from database
	resource, err := s.scraper.GetResourceByID(ctx, resourceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get resource: %w", err)
	}

	// Validate it's a video
	if resource.ResourceType != "video" {
		return nil, fmt.Errorf("resource is not a video, type: %s", resource.ResourceType)
	}

	// Check if already being analyzed
	s.mu.Lock()
	if s.activeAnalyses[resourceID.Hex()] {
		s.mu.Unlock()
		return nil, fmt.Errorf("analysis already in progress for this resource")
	}
	s.activeAnalyses[resourceID.Hex()] = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.activeAnalyses, resourceID.Hex())
		s.mu.Unlock()
	}()

	// Create pending analysis record
	analysis := &VideoAnalysis{
		ResourceID: resourceID,
		VideoID:    s.getVideoID(resource),
		VideoTitle: resource.Title,
		Status:     "pending",
		AnalyzedAt: time.Now(),
	}

	insertResult, err := s.analysisCollection.InsertOne(ctx, analysis)
	if err != nil {
		return nil, fmt.Errorf("failed to create analysis record: %w", err)
	}
	analysis.ID = insertResult.InsertedID.(primitive.ObjectID)

	// Start background analysis
	go s.performAnalysisAsync(context.Background(), analysis, resource)

	return analysis, nil
}

// AnalyzeVideoResourceSync performs synchronous analysis (waits for completion)
func (s *VideoAnalyzerService) AnalyzeVideoResourceSync(ctx context.Context, resourceID primitive.ObjectID) (*VideoAnalysis, error) {
	// Check if analysis already exists
	existingAnalysis, err := s.GetAnalysisByResourceID(ctx, resourceID)
	if err == nil && existingAnalysis != nil && existingAnalysis.Status == "completed" {
		if time.Since(existingAnalysis.AnalyzedAt) < 7*24*time.Hour {
			return existingAnalysis, nil
		}
	}

	// Get resource
	resource, err := s.scraper.GetResourceByID(ctx, resourceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get resource: %w", err)
	}

	if resource.ResourceType != "video" {
		return nil, fmt.Errorf("resource is not a video")
	}

	// Ensure transcript exists
	if err := s.ensureTranscript(ctx, resource); err != nil {
		return nil, fmt.Errorf("failed to get transcript: %w", err)
	}

	// Perform analysis
	analysis, err := s.analyzeWithLLM(ctx, resource)
	if err != nil {
		return nil, fmt.Errorf("analysis failed: %w", err)
	}

	// Store analysis
	analysis.ResourceID = resourceID
	analysis.Status = "completed"
	analysis.AnalyzedAt = time.Now()

	_, err = s.analysisCollection.InsertOne(ctx, analysis)
	if err != nil {
		return nil, fmt.Errorf("failed to store analysis: %w", err)
	}

	return analysis, nil
}

// performAnalysisAsync performs analysis in background
func (s *VideoAnalyzerService) performAnalysisAsync(ctx context.Context, analysis *VideoAnalysis, resource *scraper.EducationalResource) {
	s.logger.Info("Starting async video analysis",
		zap.String("resource_id", analysis.ResourceID.Hex()),
		zap.String("video_id", analysis.VideoID))

	// Ensure we have transcript
	if err := s.ensureTranscript(ctx, resource); err != nil {
		s.updateAnalysisStatus(ctx, analysis.ID, "failed", err.Error())
		s.logger.Error("Failed to get transcript", zap.Error(err))
		return
	}

	// Perform LLM analysis
	result, err := s.analyzeWithLLM(ctx, resource)
	if err != nil {
		s.updateAnalysisStatus(ctx, analysis.ID, "failed", err.Error())
		s.logger.Error("LLM analysis failed", zap.Error(err))
		return
	}

	// Update analysis with results
	update := bson.M{
		"$set": bson.M{
			"summary":             result.Summary,
			"prerequisites":       result.Prerequisites,
			"key_concepts":        result.KeyConcepts,
			"difficulty_level":    result.DifficultyLevel,
			"estimated_time":      result.EstimatedTime,
			"learning_objectives": result.LearningObjectives,
			"transcript_length":   result.TranscriptLength,
			"status":              "completed",
			"analyzed_at":         time.Now(),
		},
	}

	_, err = s.analysisCollection.UpdateOne(ctx, bson.M{"_id": analysis.ID}, update)
	if err != nil {
		s.logger.Error("Failed to update analysis", zap.Error(err))
		return
	}

	s.logger.Info("Video analysis completed",
		zap.String("resource_id", analysis.ResourceID.Hex()),
		zap.Int("prerequisites", len(result.Prerequisites)))
}

// ensureTranscript ensures the resource has a transcript, fetching if needed
func (s *VideoAnalyzerService) ensureTranscript(ctx context.Context, resource *scraper.EducationalResource) error {
	// If transcript already exists, return
	if resource.Transcript != nil && *resource.Transcript != "" {
		return nil
	}

	// Extract video ID
	videoID := s.getVideoID(resource)
	if videoID == "" {
		return fmt.Errorf("could not extract video ID from resource")
	}

	// Fetch transcript (this would call your YouTube transcript fetcher)
	// For now, assuming the scraper has this method
	transcript, err := s.scraper.FetchYouTubeTranscript(ctx, videoID)
	if err != nil {
		return fmt.Errorf("failed to fetch transcript: %w", err)
	}

	if transcript == "" {
		return fmt.Errorf("no transcript available for video")
	}

	// Update resource with transcript
	resource.Transcript = &transcript

	return nil
}

// analyzeWithLLM performs the actual LLM analysis
func (s *VideoAnalyzerService) analyzeWithLLM(ctx context.Context, resource *scraper.EducationalResource) (*VideoAnalysis, error) {
	if resource.Transcript == nil || *resource.Transcript == "" {
		return nil, fmt.Errorf("no transcript available")
	}

	transcript := *resource.Transcript
	transcriptLength := len(transcript)

	// Truncate if too long (keep first 6000 chars for better context)
	if len(transcript) > 6000 {
		transcript = transcript[:6000] + "..."
	}

	// Build analysis prompt
	prompt := s.buildAnalysisPrompt(resource.Title, transcript)

	// Call Gemini LLM
	response, err := s.llmClient.GenerateText(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("LLM generation failed: %w", err)
	}

	// Parse response
	analysis, err := s.parseAnalysisResponse(response)
	if err != nil {
		s.logger.Warn("Failed to parse LLM response, using fallback", zap.Error(err))
		analysis = s.createFallbackAnalysis(resource.Title, transcript)
	}

	analysis.VideoID = s.getVideoID(resource)
	analysis.VideoTitle = resource.Title
	analysis.TranscriptLength = transcriptLength

	return analysis, nil
}

// buildAnalysisPrompt creates the LLM prompt
func (s *VideoAnalyzerService) buildAnalysisPrompt(title, transcript string) string {
	return fmt.Sprintf(`You are an expert mathematics educator. Analyze this educational video and provide structured insights.

Video Title: %s

Transcript:
%s

Provide a JSON response with this exact structure:
{
  "summary": "A clear 2-3 sentence summary of what the video teaches",
  "prerequisites": ["List specific prerequisite mathematical concepts needed"],
  "key_concepts": ["Main mathematical concepts covered in this video"],
  "difficulty_level": "beginner|intermediate|advanced",
  "estimated_time": "Estimated study time (e.g., '45 minutes')",
  "learning_objectives": ["What students will learn from this video"]
}

Guidelines:
- Prerequisites must be specific mathematical concepts (e.g., "Limits", "Derivative Rules", "Chain Rule")
- List 3-7 prerequisites in order of importance
- Key concepts should be the main topics covered (3-5 concepts)
- Difficulty level must be one of: beginner, intermediate, advanced
- Learning objectives should be concrete and actionable (3-5 objectives)
- Be precise and educational

Respond ONLY with valid JSON, no additional text or markdown.`, title, transcript)
}

// parseAnalysisResponse parses LLM JSON response
func (s *VideoAnalyzerService) parseAnalysisResponse(response string) (*VideoAnalysis, error) {
	// Clean response
	response = strings.TrimSpace(response)
	response = strings.TrimPrefix(response, "```json")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	var analysis VideoAnalysis
	if err := json.Unmarshal([]byte(response), &analysis); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	// Validate required fields
	if analysis.Summary == "" {
		return nil, fmt.Errorf("missing summary in response")
	}

	return &analysis, nil
}

// createFallbackAnalysis creates a basic analysis when LLM fails
func (s *VideoAnalyzerService) createFallbackAnalysis(title, transcript string) *VideoAnalysis {
	summary := fmt.Sprintf("This video covers: %s", title)
	if len(transcript) > 200 {
		summary = transcript[:200] + "..."
	}

	concepts := s.extractConceptsFromText(title + " " + transcript)
	if len(concepts) == 0 {
		concepts = []string{"Mathematics"}
	}

	return &VideoAnalysis{
		Summary:            summary,
		Prerequisites:      []string{"Basic Mathematics"},
		KeyConcepts:        concepts,
		DifficultyLevel:    "intermediate",
		EstimatedTime:      "30-45 minutes",
		LearningObjectives: []string{"Understand " + title},
	}
}

// extractConceptsFromText extracts mathematical concepts from text
func (s *VideoAnalyzerService) extractConceptsFromText(text string) []string {
	text = strings.ToLower(text)

	concepts := []string{}
	seen := make(map[string]bool)

	mathTerms := []string{
		"derivative", "derivatives", "integral", "integrals", "limit", "limits",
		"function", "functions", "calculus", "algebra", "trigonometry", "geometry",
		"equation", "equations", "theorem", "theorems", "proof", "proofs",
		"matrix", "matrices", "vector", "vectors", "polynomial", "polynomials",
		"exponential", "logarithm", "logarithms", "differential", "differentials",
		"chain rule", "product rule", "quotient rule", "power rule",
	}

	for _, term := range mathTerms {
		if strings.Contains(text, term) {
			canonical := strings.Title(strings.TrimSuffix(term, "s"))
			if !seen[canonical] {
				concepts = append(concepts, canonical)
				seen[canonical] = true
			}
		}
	}

	return concepts
}

// getVideoID extracts video ID from resource
func (s *VideoAnalyzerService) getVideoID(resource *scraper.EducationalResource) string {
	if resource.VideoID != nil {
		return *resource.VideoID
	}

	// Try to extract from URL
	if strings.Contains(resource.URL, "youtube.com/watch?v=") {
		parts := strings.Split(resource.URL, "v=")
		if len(parts) > 1 {
			videoID := strings.Split(parts[1], "&")[0]
			return videoID
		}
	} else if strings.Contains(resource.URL, "youtu.be/") {
		parts := strings.Split(resource.URL, "youtu.be/")
		if len(parts) > 1 {
			videoID := strings.Split(parts[1], "?")[0]
			return videoID
		}
	}

	return ""
}

// updateAnalysisStatus updates the status of an analysis
func (s *VideoAnalyzerService) updateAnalysisStatus(ctx context.Context, analysisID primitive.ObjectID, status, errorMsg string) {
	update := bson.M{
		"$set": bson.M{
			"status": status,
		},
	}

	if errorMsg != "" {
		update["$set"].(bson.M)["error_message"] = errorMsg
	}

	_, err := s.analysisCollection.UpdateOne(ctx, bson.M{"_id": analysisID}, update)
	if err != nil {
		s.logger.Error("Failed to update analysis status", zap.Error(err))
	}
}

// GetAnalysisByResourceID retrieves analysis by resource ID
func (s *VideoAnalyzerService) GetAnalysisByResourceID(ctx context.Context, resourceID primitive.ObjectID) (*VideoAnalysis, error) {
	var analysis VideoAnalysis

	// Find the most recent analysis for this resource
	opts := mongo.NewFindOneOptions().SetSort(bson.D{{"analyzed_at", -1}})
	err := s.analysisCollection.FindOne(ctx, bson.M{"resource_id": resourceID}, opts).Decode(&analysis)

	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get analysis: %w", err)
	}

	return &analysis, nil
}

// GetAnalysisByID retrieves analysis by its ID
func (s *VideoAnalyzerService) GetAnalysisByID(ctx context.Context, analysisID primitive.ObjectID) (*VideoAnalysis, error) {
	var analysis VideoAnalysis
	err := s.analysisCollection.FindOne(ctx, bson.M{"_id": analysisID}).Decode(&analysis)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("analysis not found")
		}
		return nil, fmt.Errorf("failed to get analysis: %w", err)
	}

	return &analysis, nil
}

// BatchAnalyzeVideos analyzes multiple videos concurrently
func (s *VideoAnalyzerService) BatchAnalyzeVideos(ctx context.Context, resourceIDs []primitive.ObjectID, maxConcurrent int) error {
	if maxConcurrent <= 0 {
		maxConcurrent = 3
	}

	sem := make(chan struct{}, maxConcurrent)
	var wg sync.WaitGroup
	errChan := make(chan error, len(resourceIDs))

	for _, resourceID := range resourceIDs {
		wg.Add(1)
		go func(rid primitive.ObjectID) {
			defer wg.Done()

			sem <- struct{}{}        // Acquire semaphore
			defer func() { <-sem }() // Release semaphore

			if _, err := s.AnalyzeVideoResource(ctx, rid); err != nil {
				s.logger.Error("Failed to analyze video",
					zap.String("resource_id", rid.Hex()),
					zap.Error(err))
				errChan <- err
			}
		}(resourceID)
	}

	wg.Wait()
	close(errChan)

	// Collect errors
	var errors []error
	for err := range errChan {
		errors = append(errors, err)
	}

	if len(errors) > 0 {
		return fmt.Errorf("batch analysis completed with %d errors", len(errors))
	}

	return nil
}
