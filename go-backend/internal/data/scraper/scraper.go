package scraper

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/mathprereq/pkg/logger"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"golang.org/x/time/rate"
)

// EducationalResource represents a scraped educational resource
type EducationalResource struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ConceptID       string             `bson:"concept_id" json:"concept_id"`
	ConceptName     string             `bson:"concept_name" json:"concept_name"`
	Title           string             `bson:"title" json:"title"`
	URL             string             `bson:"url" json:"url"`
	Description     string             `bson:"description" json:"description"`
	ResourceType    string             `bson:"resource_type" json:"resource_type"` // video, article, tutorial, example, practice
	SourceDomain    string             `bson:"source_domain" json:"source_domain"`
	DifficultyLevel string             `bson:"difficulty_level" json:"difficulty_level"` // beginner, intermediate, advanced
	QualityScore    float64            `bson:"quality_score" json:"quality_score"`       // 0.0 to 1.0
	ContentPreview  string             `bson:"content_preview" json:"content_preview"`
	ScrapedAt       time.Time          `bson:"scraped_at" json:"scraped_at"`
	Language        string             `bson:"language" json:"language"`
	Duration        *string            `bson:"duration,omitempty" json:"duration,omitempty"`           // For videos
	ThumbnailURL    *string            `bson:"thumbnail_url,omitempty" json:"thumbnail_url,omitempty"` // For videos
	ViewCount       *int64             `bson:"view_count,omitempty" json:"view_count,omitempty"`
	Rating          *float64           `bson:"rating,omitempty" json:"rating,omitempty"`
	AuthorChannel   *string            `bson:"author_channel,omitempty" json:"author_channel,omitempty"`
	PublishedAt     *time.Time         `bson:"published_at,omitempty" json:"published_at,omitempty"`
	Tags            []string           `bson:"tags" json:"tags"`
	IsVerified      bool               `bson:"is_verified" json:"is_verified"`
}

// ScraperConfig holds configuration for the scraper
type ScraperConfig struct {
	MaxConcurrentRequests int           `json:"max_concurrent_requests"`
	RequestTimeout        time.Duration `json:"request_timeout"`
	RateLimit             float64       `json:"rate_limit"` // requests per second
	UserAgent             string        `json:"user_agent"`
	MongoURI              string        `json:"mongo_uri"`
	DatabaseName          string        `json:"database_name"`
	CollectionName        string        `json:"collection_name"`
	MaxRetries            int           `json:"max_retries"`
	RetryDelay            time.Duration `json:"retry_delay"`
}

// EducationalWebScraper scrapes educational content
type EducationalWebScraper struct {
	config       ScraperConfig
	httpClient   *http.Client
	limiter      *rate.Limiter
	mongoClient  *mongo.Client
	collection   *mongo.Collection
	logger       *zap.Logger
	scrapedURLs  sync.Map // Thread-safe cache of scraped URLs
	sharedClient bool     // Whether we're using a shared MongoDB client

	// Educational domains to target
	educationalDomains []string
}

// YouTubeVideoData represents YouTube video information
type YouTubeVideoData struct {
	VideoID       string `json:"videoId"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	Duration      string `json:"duration"`
	ViewCount     string `json:"views"`
	Channel       string `json:"channel"`
	ThumbnailURL  string `json:"thumbnail"`
	PublishedTime string `json:"publishedTime"`
}

// New creates a new scraper instance using an existing MongoDB client
func New(config ScraperConfig, mongoClient *mongo.Client) (*EducationalWebScraper, error) {
	logger := logger.MustGetLogger()

	// Set defaults
	if config.MaxConcurrentRequests == 0 {
		config.MaxConcurrentRequests = 10
	}
	if config.RequestTimeout == 0 {
		config.RequestTimeout = 30 * time.Second
	}
	if config.RateLimit == 0 {
		config.RateLimit = 5.0 // 5 requests per second
	}
	if config.UserAgent == "" {
		config.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
	}
	if config.MaxRetries == 0 {
		config.MaxRetries = 3
	}
	if config.RetryDelay == 0 {
		config.RetryDelay = 2 * time.Second
	}

	// Create HTTP client with connection pooling
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
	}

	httpClient := &http.Client{
		Transport: transport,
		Timeout:   config.RequestTimeout,
	}

	// Create rate limiter
	limiter := rate.NewLimiter(rate.Limit(config.RateLimit), 1)

	// Use existing MongoDB client
	collection := mongoClient.Database(config.DatabaseName).Collection(config.CollectionName)

	// Create indexes (and ignore auth errors if they happen, since we might not have perms)
	if err := createIndexes(context.Background(), collection); err != nil {
		// This error is expected if the user doesn't have admin rights, so we just log it.
		if strings.Contains(err.Error(), "requires authentication") || strings.Contains(err.Error(), "not authorized") {
			logger.Debug("Skipping index creation due to permissions", zap.Error(err))
		} else {
			logger.Warn("Failed to create indexes", zap.Error(err))
		}
	}

	educationalDomains := []string{
		"youtube.com", "youtu.be", "khanacademy.org", "coursera.org", "edx.org",
		"mit.edu", "stanford.edu", "mathworld.wolfram.com", "brilliant.org",
		"mathisfun.com", "paulmscience.com", "tutorial.math.lamar.edu",
		"mathinsight.org", "betterexplained.com", "patrickjmt.com",
		"professorleonard.com", "organic-chemistry.com", "symbolab.com",
	}

	scraper := &EducationalWebScraper{
		config:             config,
		httpClient:         httpClient,
		limiter:            limiter,
		mongoClient:        mongoClient,
		collection:         collection,
		logger:             logger,
		educationalDomains: educationalDomains,
		sharedClient:       true, // This is now always true
	}

	logger.Info("Educational web scraper initialized",
		zap.Int("max_concurrent", config.MaxConcurrentRequests),
		zap.Float64("rate_limit", config.RateLimit),
		zap.String("database", config.DatabaseName))

	return scraper, nil
}

// createIndexes creates MongoDB indexes for efficient queries
func createIndexes(ctx context.Context, collection *mongo.Collection) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{"concept_id", 1}},
		},
		{
			Keys:    bson.D{{"url", 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{"quality_score", -1}},
		},
		{
			Keys: bson.D{{"scraped_at", -1}},
		},
		{
			Keys: bson.D{
				{"concept_id", 1},
				{"quality_score", -1},
			},
		},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		// Don't return an error for duplicate keys, as it's not a failure
		if !mongo.IsDuplicateKeyError(err) {
			return fmt.Errorf("failed to create indexes: %w", err)
		}
	}
	return nil
}

// Close closes the scraper and its connections
func (s *EducationalWebScraper) Close(ctx context.Context) error {
	// Only close the MongoDB client if we created it ourselves
	if !s.sharedClient && s.mongoClient != nil {
		return s.mongoClient.Disconnect(ctx)
	}
	return nil
}

// ScrapeResourcesForConcepts scrapes educational resources for given concepts
func (s *EducationalWebScraper) ScrapeResourcesForConcepts(ctx context.Context, conceptNames []string) error {
	s.logger.Info("Starting resource scraping", zap.Int("concepts", len(conceptNames)))

	// Process concepts in batches
	batchSize := 3
	for i := 0; i < len(conceptNames); i += batchSize {
		end := i + batchSize
		if end > len(conceptNames) {
			end = len(conceptNames)
		}

		batch := conceptNames[i:end]
		s.logger.Info("Processing batch",
			zap.Int("batch", i/batchSize+1),
			zap.Int("total_batches", (len(conceptNames)+batchSize-1)/batchSize))

		if err := s.processBatch(ctx, batch); err != nil {
			s.logger.Error("Batch processing failed", zap.Error(err))
			continue
		}

		// Rate limiting between batches
		time.Sleep(2 * time.Second)
	}

	s.logger.Info("Resource scraping completed", zap.Int("total_concepts", len(conceptNames)))
	return nil
}

// processBatch processes a batch of concepts concurrently
func (s *EducationalWebScraper) processBatch(ctx context.Context, conceptNames []string) error {
	g, gCtx := errgroup.WithContext(ctx)
	g.SetLimit(s.config.MaxConcurrentRequests)

	for _, conceptName := range conceptNames {
		conceptName := conceptName // Capture for goroutine
		g.Go(func() error {
			return s.scrapeResourcesForConcept(gCtx, conceptName)
		})
	}

	return g.Wait()
}

// scrapeResourcesForConcept scrapes resources for a single concept
func (s *EducationalWebScraper) scrapeResourcesForConcept(ctx context.Context, conceptName string) error {
	s.logger.Info("Scraping resources for concept", zap.String("concept", conceptName))

	conceptID := s.generateConceptID(conceptName)

	// Check if we've recently scraped this concept
	if s.isRecentlyScraped(ctx, conceptID) {
		s.logger.Info("Concept recently scraped, skipping", zap.String("concept", conceptName))
		return nil
	}

	var allResources []EducationalResource

	// Search different platforms concurrently
	g, gCtx := errgroup.WithContext(ctx)
	var mu sync.Mutex

	searchFunctions := []func(context.Context, string, string) ([]EducationalResource, error){
		s.searchYouTube,
		s.searchKhanAcademy,
		s.searchMathWorld,
		s.searchGeneralEducationSites,
	}

	for _, searchFunc := range searchFunctions {
		searchFunc := searchFunc // Capture for goroutine
		g.Go(func() error {
			resources, err := searchFunc(gCtx, conceptID, conceptName)
			if err != nil {
				s.logger.Warn("Search function failed", zap.Error(err))
				return nil // Don't fail the entire operation
			}

			mu.Lock()
			allResources = append(allResources, resources...)
			mu.Unlock()

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return fmt.Errorf("failed to search platforms: %w", err)
	}

	// Post-process resources
	uniqueResources := s.deduplicateResources(allResources)
	qualityResources := s.filterQualityResources(uniqueResources)

	// Store in MongoDB
	if len(qualityResources) > 0 {
		if err := s.storeResources(ctx, qualityResources); err != nil {
			s.logger.Error("Failed to store resources", zap.Error(err))
			return err
		}
	}

	s.logger.Info("Successfully scraped concept",
		zap.String("concept", conceptName),
		zap.Int("total_found", len(allResources)),
		zap.Int("quality_stored", len(qualityResources)))

	return nil
}

// generateConceptID creates a standardized concept ID
func (s *EducationalWebScraper) generateConceptID(conceptName string) string {
	id := strings.ToLower(conceptName)
	id = strings.ReplaceAll(id, " ", "_")
	id = strings.ReplaceAll(id, "-", "_")
	// Remove special characters
	reg := regexp.MustCompile(`[^a-zA-Z0-9_]`)
	return reg.ReplaceAllString(id, "")
}

// normalizeConceptForSearch normalizes concept names for better search results
func (s *EducationalWebScraper) normalizeConceptForSearch(concept string) string {
	// Remove extra spaces and normalize
	normalized := strings.TrimSpace(concept)
	normalized = regexp.MustCompile(`\s+`).ReplaceAllString(normalized, " ")
	
	// Convert to title case for better search results
	words := strings.Fields(strings.ToLower(normalized))
	for i, word := range words {
		if len(word) > 0 {
			words[i] = strings.ToUpper(string(word[0])) + word[1:]
		}
	}
	normalized = strings.Join(words, " ")
	
	return normalized
}

// generateSearchTerms creates multiple search variations for better results
func (s *EducationalWebScraper) generateSearchTerms(concept string) []string {
	normalized := s.normalizeConceptForSearch(concept)
	
	terms := []string{
		normalized,                           // "Basic Functions"
		normalized + " mathematics",          // "Basic Functions mathematics"
		normalized + " math tutorial",        // "Basic Functions math tutorial"
	}
	
	// Add variations for multi-word concepts
	if strings.Contains(normalized, " ") {
		// Remove common words that might confuse search
		withoutCommon := regexp.MustCompile(`\b(Basic|Advanced|Elementary|Introduction|to|the|of|and|in)\b`).ReplaceAllString(normalized, "")
		withoutCommon = regexp.MustCompile(`\s+`).ReplaceAllString(strings.TrimSpace(withoutCommon), " ")
		
		if withoutCommon != "" && withoutCommon != normalized {
			terms = append(terms, withoutCommon)
		}
	}
	
	return terms
}

// isRecentlyScraped checks if a concept was scraped recently
func (s *EducationalWebScraper) isRecentlyScraped(ctx context.Context, conceptID string) bool {
	// Check if scraped within last 24 hours
	since := time.Now().Add(-24 * time.Hour)
	filter := bson.M{
		"concept_id": conceptID,
		"scraped_at": bson.M{"$gte": since},
	}

	count, err := s.collection.CountDocuments(ctx, filter)
	if err != nil {
		s.logger.Warn("Failed to check recent scraping", zap.Error(err))
		return false
	}

	return count > 0
}

// storeResources stores resources in MongoDB with upsert logic
func (s *EducationalWebScraper) storeResources(ctx context.Context, resources []EducationalResource) error {
	if len(resources) == 0 {
		return nil
	}

	// Use bulk write for efficiency
	var writes []mongo.WriteModel

	for _, resource := range resources {
		filter := bson.M{"url": resource.URL}
		update := bson.M{"$set": resource}

		upsert := mongo.NewUpdateOneModel().
			SetFilter(filter).
			SetUpdate(update).
			SetUpsert(true)

		writes = append(writes, upsert)
	}

	opts := options.BulkWrite().SetOrdered(false)
	result, err := s.collection.BulkWrite(ctx, writes, opts)
	if err != nil {
		return fmt.Errorf("bulk write failed: %w", err)
	}

	s.logger.Info("Stored resources in MongoDB",
		zap.Int64("inserted", result.InsertedCount),
		zap.Int64("modified", result.ModifiedCount),
		zap.Int64("upserted", result.UpsertedCount))

	return nil
}

// GetResourcesForConcept retrieves stored resources for a concept
func (s *EducationalWebScraper) GetResourcesForConcept(ctx context.Context, conceptID string, limit int) ([]EducationalResource, error) {
	filter := bson.M{"concept_id": conceptID}

	opts := options.Find().
		SetSort(bson.D{{"quality_score", -1}}).
		SetLimit(int64(limit))

	cursor, err := s.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to query resources: %w", err)
	}
	defer cursor.Close(ctx)

	var resources []EducationalResource
	if err := cursor.All(ctx, &resources); err != nil {
		return nil, fmt.Errorf("failed to decode resources: %w", err)
	}

	return resources, nil
}

// GetResourceStats returns statistics about stored resources
func (s *EducationalWebScraper) GetResourceStats(ctx context.Context) (map[string]interface{}, error) {
	pipeline := mongo.Pipeline{
		{{"$group", bson.D{
			{"_id", "$concept_id"},
			{"count", bson.D{{"$sum", 1}}},
			{"avg_quality", bson.D{{"$avg", "$quality_score"}}},
		}}},
		{{"$group", bson.D{
			{"_id", nil},
			{"total_concepts", bson.D{{"$sum", 1}}},
			{"total_resources", bson.D{{"$sum", "$count"}}},
			{"avg_resources_per_concept", bson.D{{"$avg", "$count"}}},
			{"avg_quality_score", bson.D{{"$avg", "$avg_quality"}}},
		}}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("aggregation failed: %w", err)
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		return nil, fmt.Errorf("failed to decode results: %w", err)
	}

	if len(results) == 0 {
		return map[string]interface{}{
			"total_concepts":            0,
			"total_resources":           0,
			"avg_resources_per_concept": 0.0,
			"avg_quality_score":         0.0,
		}, nil
	}

	return results[0], nil
}

// searchYouTube searches YouTube for educational videos
func (s *EducationalWebScraper) searchYouTube(ctx context.Context, conceptID, conceptName string) ([]EducationalResource, error) {
	if err := s.limiter.Wait(ctx); err != nil {
		return nil, err
	}

	s.logger.Info("Searching YouTube", zap.String("concept", conceptName))

	searchTerms := s.generateSearchTerms(conceptName)
	var allResources []EducationalResource

	for i, searchTerm := range searchTerms {
		if i >= 2 { // Limit to 2 searches per concept to avoid rate limits
			break
		}

		// Create shorter timeout for individual searches
		searchCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
		
		searchURL := fmt.Sprintf("https://www.youtube.com/results?search_query=%s", url.QueryEscape(searchTerm))

		resources, err := s.scrapeYouTubeResults(searchCtx, searchURL, conceptID, conceptName)
		cancel()

		if err != nil {
			s.logger.Warn("YouTube search failed", 
				zap.String("term", searchTerm), 
				zap.Error(err))
			continue
		}

		allResources = append(allResources, resources...)

		// Rate limiting between searches
		time.Sleep(time.Second)
	}

	// Limit results and deduplicate
	if len(allResources) > 5 {
		allResources = allResources[:5]
	}

	return s.deduplicateResources(allResources), nil
}

// scrapeYouTubeResults scrapes YouTube search results page
func (s *EducationalWebScraper) scrapeYouTubeResults(ctx context.Context, searchURL, conceptID, conceptName string) ([]EducationalResource, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", s.config.UserAgent)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("YouTube returned status %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	// Extract ytInitialData
	var ytInitialData map[string]interface{}
	doc.Find("script").Each(func(i int, script *goquery.Selection) {
		content := script.Text()
		if strings.Contains(content, "var ytInitialData = ") {
			// Extract JSON data
			start := strings.Index(content, "var ytInitialData = ") + len("var ytInitialData = ")
			end := strings.Index(content[start:], "};") + 1
			if end > 0 {
				jsonStr := content[start : start+end]
				if err := json.Unmarshal([]byte(jsonStr), &ytInitialData); err == nil {
					return
				}
			}
		}
	})

	videos := s.extractVideoInfoFromYouTubeData(ytInitialData)
	var resources []EducationalResource

	for _, video := range videos {
		if len(resources) >= 3 { // Limit results per search
			break
		}

		if !s.isEducationalVideo(video) {
			continue
		}

		resource := EducationalResource{
			ConceptID:       conceptID,
			ConceptName:     conceptName,
			Title:           video.Title,
			URL:             fmt.Sprintf("https://www.youtube.com/watch?v=%s", video.VideoID),
			Description:     s.truncateString(video.Description, 500),
			ResourceType:    "video",
			SourceDomain:    "youtube.com",
			DifficultyLevel: s.assessVideoDifficulty(video),
			QualityScore:    s.calculateYouTubeQualityScore(video),
			ContentPreview:  s.truncateString(video.Description, 200),
			ScrapedAt:       time.Now(),
			Language:        "en",
			Duration:        &video.Duration,
			ThumbnailURL:    &video.ThumbnailURL,
			AuthorChannel:   &video.Channel,
			Tags:            s.extractVideoTags(video),
			IsVerified:      s.isVerifiedChannel(video.Channel),
		}

		if video.ViewCount != "" {
			if viewCount := s.parseViewCount(video.ViewCount); viewCount > 0 {
				resource.ViewCount = &viewCount
			}
		}

		resources = append(resources, resource)
	}

	return resources, nil
}

// extractVideoInfoFromYouTubeData extracts video information from YouTube's data
func (s *EducationalWebScraper) extractVideoInfoFromYouTubeData(data map[string]interface{}) []YouTubeVideoData {
	var videos []YouTubeVideoData

	if data == nil {
		return videos
	}

	// Navigate YouTube's data structure
	contents, ok := data["contents"].(map[string]interface{})
	if !ok {
		return videos
	}

	twoCol, ok := contents["twoColumnSearchResultsRenderer"].(map[string]interface{})
	if !ok {
		return videos
	}

	primary, ok := twoCol["primaryContents"].(map[string]interface{})
	if !ok {
		return videos
	}

	sectionList, ok := primary["sectionListRenderer"].(map[string]interface{})
	if !ok {
		return videos
	}

	sectionContents, ok := sectionList["contents"].([]interface{})
	if !ok {
		return videos
	}

	for _, section := range sectionContents {
		sectionMap, ok := section.(map[string]interface{})
		if !ok {
			continue
		}

		itemSection, ok := sectionMap["itemSectionRenderer"].(map[string]interface{})
		if !ok {
			continue
		}

		items, ok := itemSection["contents"].([]interface{})
		if !ok {
			continue
		}

		for _, item := range items {
			itemMap, ok := item.(map[string]interface{})
			if !ok {
				continue
			}

			videoRenderer, ok := itemMap["videoRenderer"].(map[string]interface{})
			if !ok {
				continue
			}

			video := YouTubeVideoData{
				VideoID:       s.extractStringFromYTData(videoRenderer, "videoId"),
				Title:         s.extractTextFromRuns(videoRenderer["title"]),
				Description:   s.extractTextFromRuns(videoRenderer["descriptionSnippet"]),
				Duration:      s.extractTextFromAccessibility(videoRenderer["lengthText"]),
				ViewCount:     s.extractTextFromRuns(videoRenderer["viewCountText"]),
				Channel:       s.extractTextFromRuns(videoRenderer["ownerText"]),
				ThumbnailURL:  s.extractThumbnailURL(videoRenderer["thumbnail"]),
				PublishedTime: s.extractTextFromRuns(videoRenderer["publishedTimeText"]),
			}

			if video.VideoID != "" && video.Title != "" {
				videos = append(videos, video)
			}
		}
	}

	return videos
}

// extractTextFromRuns extracts text from YouTube's text run objects
func (s *EducationalWebScraper) extractTextFromRuns(textObj interface{}) string {
	if textObj == nil {
		return ""
	}

	textMap, ok := textObj.(map[string]interface{})
	if !ok {
		return fmt.Sprintf("%v", textObj)
	}

	if runs, ok := textMap["runs"].([]interface{}); ok {
		var text strings.Builder
		for _, run := range runs {
			if runMap, ok := run.(map[string]interface{}); ok {
				if runText, ok := runMap["text"].(string); ok {
					text.WriteString(runText)
				}
			}
		}
		return text.String()
	}

	if simpleText, ok := textMap["simpleText"].(string); ok {
		return simpleText
	}

	return ""
}

// extractTextFromAccessibility extracts text from accessibility objects
func (s *EducationalWebScraper) extractTextFromAccessibility(textObj interface{}) string {
	if textObj == nil {
		return ""
	}

	textMap, ok := textObj.(map[string]interface{})
	if !ok {
		return s.extractTextFromRuns(textObj)
	}

	if accessibility, ok := textMap["accessibility"].(map[string]interface{}); ok {
		if accessData, ok := accessibility["accessibilityData"].(map[string]interface{}); ok {
			if label, ok := accessData["label"].(string); ok {
				return label
			}
		}
	}

	return s.extractTextFromRuns(textObj)
}

// extractStringFromYTData safely extracts string values
func (s *EducationalWebScraper) extractStringFromYTData(data map[string]interface{}, key string) string {
	if value, ok := data[key].(string); ok {
		return value
	}
	return ""
}

// extractThumbnailURL extracts thumbnail URL from YouTube data
func (s *EducationalWebScraper) extractThumbnailURL(thumbnailObj interface{}) string {
	if thumbnailObj == nil {
		return ""
	}

	thumbnailMap, ok := thumbnailObj.(map[string]interface{})
	if !ok {
		return ""
	}

	thumbnails, ok := thumbnailMap["thumbnails"].([]interface{})
	if !ok || len(thumbnails) == 0 {
		return ""
	}

	// Get the highest quality thumbnail (last one)
	lastThumbnail := thumbnails[len(thumbnails)-1]
	if thumbMap, ok := lastThumbnail.(map[string]interface{}); ok {
		if url, ok := thumbMap["url"].(string); ok {
			return url
		}
	}

	return ""
}

// isEducationalVideo checks if a video is educational
func (s *EducationalWebScraper) isEducationalVideo(video YouTubeVideoData) bool {
	title := strings.ToLower(video.Title)
	channel := strings.ToLower(video.Channel)
	description := strings.ToLower(video.Description)

	content := fmt.Sprintf("%s %s %s", title, channel, description)

	// Educational keywords
	educationalKeywords := []string{
		"tutorial", "explained", "learn", "how to", "lesson", "lecture",
		"calculus", "mathematics", "math", "derivative", "integral",
		"step by step", "example", "practice", "course", "education",
	}

	// Known educational channels
	educationalChannels := []string{
		"khan academy", "patrickjmt", "professor leonard", "organic chemistry tutor",
		"mathologer", "blackpenredpen", "bprp", "krista king math", "math and science",
		"eddie woo", "nancy pi", "professor dave explains", "3blue1brown",
	}

	// Check for educational content
	hasEducationalKeywords := false
	for _, keyword := range educationalKeywords {
		if strings.Contains(content, keyword) {
			hasEducationalKeywords = true
			break
		}
	}

	isEducationalChannel := false
	for _, eduChannel := range educationalChannels {
		if strings.Contains(channel, eduChannel) {
			isEducationalChannel = true
			break
		}
	}

	return hasEducationalKeywords || isEducationalChannel
}

// assessVideoDifficulty assesses video difficulty level
func (s *EducationalWebScraper) assessVideoDifficulty(video YouTubeVideoData) string {
	content := strings.ToLower(fmt.Sprintf("%s %s", video.Title, video.Description))

	beginnerKeywords := []string{"intro", "basic", "beginner", "simple", "easy", "start", "fundamental"}
	advancedKeywords := []string{"advanced", "complex", "graduate", "proof", "theorem", "rigorous"}

	beginnerScore := 0
	for _, keyword := range beginnerKeywords {
		if strings.Contains(content, keyword) {
			beginnerScore++
		}
	}

	advancedScore := 0
	for _, keyword := range advancedKeywords {
		if strings.Contains(content, keyword) {
			advancedScore++
		}
	}

	if beginnerScore > advancedScore {
		return "beginner"
	} else if advancedScore > beginnerScore {
		return "advanced"
	}
	return "intermediate"
}

// calculateYouTubeQualityScore calculates quality score for YouTube video
func (s *EducationalWebScraper) calculateYouTubeQualityScore(video YouTubeVideoData) float64 {
	score := 0.5 // Base score

	// Channel reputation
	channel := strings.ToLower(video.Channel)
	reputableChannels := []string{
		"khan academy", "patrickjmt", "professor leonard",
		"organic chemistry tutor", "mathologer", "3blue1brown",
	}

	for _, reputableChannel := range reputableChannels {
		if strings.Contains(channel, reputableChannel) {
			score += 0.3
			break
		}
	}

	// Title quality
	title := strings.ToLower(video.Title)
	if len(video.Title) > 20 {
		score += 0.1
	}
	if strings.Contains(title, "explained") || strings.Contains(title, "tutorial") {
		score += 0.1
	}

	// Duration preference (10-30 minutes for tutorials)
	if strings.Contains(video.Duration, "1") || strings.Contains(video.Duration, "2") {
		score += 0.1
	}

	// View count (if available)
	if viewCount := s.parseViewCount(video.ViewCount); viewCount > 10000 {
		score += 0.1
	}

	if score > 1.0 {
		return 1.0
	}
	return score
}

// parseViewCount parses view count string to integer
func (s *EducationalWebScraper) parseViewCount(viewCountStr string) int64 {
	if viewCountStr == "" {
		return 0
	}

	// Remove "views" and other text, extract numbers
	re := regexp.MustCompile(`[\d,]+`)
	matches := re.FindAllString(viewCountStr, -1)

	if len(matches) == 0 {
		return 0
	}

	numStr := strings.ReplaceAll(matches[0], ",", "")
	if count, err := strconv.ParseInt(numStr, 10, 64); err == nil {
		return count
	}

	return 0
}

// extractVideoTags extracts relevant tags from video
func (s *EducationalWebScraper) extractVideoTags(video YouTubeVideoData) []string {
	var tags []string
	content := strings.ToLower(fmt.Sprintf("%s %s", video.Title, video.Description))

	mathTags := []string{
		"calculus", "derivative", "integral", "limit", "function",
		"algebra", "geometry", "trigonometry", "statistics", "probability",
	}

	for _, tag := range mathTags {
		if strings.Contains(content, tag) {
			tags = append(tags, tag)
		}
	}

	return tags
}

// isVerifiedChannel checks if channel is verified (simplified)
func (s *EducationalWebScraper) isVerifiedChannel(channel string) bool {
	verifiedChannels := []string{
		"Khan Academy", "PatrickJMT", "Professor Leonard",
		"Organic Chemistry Tutor", "Mathologer", "3Blue1Brown",
	}

	for _, verified := range verifiedChannels {
		if strings.EqualFold(channel, verified) {
			return true
		}
	}

	return false
}

// searchKhanAcademy searches Khan Academy for resources
func (s *EducationalWebScraper) searchKhanAcademy(ctx context.Context, conceptID, conceptName string) ([]EducationalResource, error) {
	if err := s.limiter.Wait(ctx); err != nil {
		return nil, err
	}

	s.logger.Info("Searching Khan Academy", zap.String("concept", conceptName))

	searchURL := fmt.Sprintf("https://www.khanacademy.org/search?search_again=1&page_search_query=%s", url.QueryEscape(conceptName))

	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", s.config.UserAgent)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Khan Academy returned status %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var resources []EducationalResource

	// Parse Khan Academy results
	doc.Find("a[href*='/']").Each(func(i int, sel *goquery.Selection) {
		if len(resources) >= 3 {
			return
		}

		href, exists := sel.Attr("href")
		if !exists || !strings.Contains(href, "/e/") && !strings.Contains(href, "/v/") {
			return
		}

		title := strings.TrimSpace(sel.Text())
		if title == "" {
			if ariaLabel, exists := sel.Attr("aria-label"); exists {
				title = ariaLabel
			}
		}

		if title != "" && len(title) > 10 {
			fullURL := s.makeAbsoluteURL("https://www.khanacademy.org", href)

			resource := EducationalResource{
				ConceptID:       conceptID,
				ConceptName:     conceptName,
				Title:           title,
				URL:             fullURL,
				Description:     fmt.Sprintf("Khan Academy lesson on %s", conceptName),
				ResourceType:    "tutorial",
				SourceDomain:    "khanacademy.org",
				DifficultyLevel: "beginner",
				QualityScore:    0.9, // Khan Academy is high quality
				ContentPreview:  title,
				ScrapedAt:       time.Now(),
				Language:        "en",
				Tags:            []string{"khan-academy", "tutorial"},
				IsVerified:      true,
			}

			resources = append(resources, resource)
		}
	})

	return resources, nil
}

// searchMathWorld searches Wolfram MathWorld for resources
func (s *EducationalWebScraper) searchMathWorld(ctx context.Context, conceptID, conceptName string) ([]EducationalResource, error) {
	if err := s.limiter.Wait(ctx); err != nil {
		return nil, err
	}

	s.logger.Info("Searching MathWorld", zap.String("concept", conceptName))

	searchURL := fmt.Sprintf("https://mathworld.wolfram.com/search/?query=%s", url.QueryEscape(conceptName))

	req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", s.config.UserAgent)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("MathWorld returned status %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var resources []EducationalResource

	// Parse MathWorld results
	doc.Find("a[href*='/topics/']").Each(func(i int, sel *goquery.Selection) {
		if len(resources) >= 2 {
			return
		}

		href, exists := sel.Attr("href")
		if !exists {
			return
		}

		title := strings.TrimSpace(sel.Text())
		if title != "" && len(title) > 5 {
			fullURL := s.makeAbsoluteURL("https://mathworld.wolfram.com", href)

			resource := EducationalResource{
				ConceptID:       conceptID,
				ConceptName:     conceptName,
				Title:           fmt.Sprintf("%s - MathWorld", title),
				URL:             fullURL,
				Description:     fmt.Sprintf("Mathematical definition and explanation of %s", conceptName),
				ResourceType:    "reference",
				SourceDomain:    "mathworld.wolfram.com",
				DifficultyLevel: "intermediate",
				QualityScore:    0.8,
				ContentPreview:  title,
				ScrapedAt:       time.Now(),
				Language:        "en",
				Tags:            []string{"mathworld", "reference", "definition"},
				IsVerified:      true,
			}

			resources = append(resources, resource)
		}
	})

	return resources, nil
}

// searchGeneralEducationSites searches other educational sites
func (s *EducationalWebScraper) searchGeneralEducationSites(ctx context.Context, conceptID, conceptName string) ([]EducationalResource, error) {
	if err := s.limiter.Wait(ctx); err != nil {
		return nil, err
	}

	s.logger.Info("Searching general education sites", zap.String("concept", conceptName))

	sitesToSearch := []struct {
		domain    string
		searchURL string
		quality   float64
	}{
		{"brilliant.org", "https://brilliant.org/search/?q=%s", 0.8},
		{"mathisfun.com", "https://www.mathsisfun.com/search/search.html?query=%s", 0.7},
	}

	var allResources []EducationalResource

	for _, site := range sitesToSearch {
		searchURL := fmt.Sprintf(site.searchURL, url.QueryEscape(conceptName))

		req, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
		if err != nil {
			s.logger.Warn("Failed to create request", zap.String("site", site.domain), zap.Error(err))
			continue
		}
		req.Header.Set("User-Agent", s.config.UserAgent)

		resp, err := s.httpClient.Do(req)
		if err != nil {
			s.logger.Warn("Failed to search site", zap.String("site", site.domain), zap.Error(err))
			continue
		}

		func() {
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				s.logger.Warn("Site returned error status",
					zap.String("site", site.domain),
					zap.Int("status", resp.StatusCode))
				return
			}

			doc, err := goquery.NewDocumentFromReader(resp.Body)
			if err != nil {
				s.logger.Warn("Failed to parse HTML", zap.String("site", site.domain), zap.Error(err))
				return
			}

			// Generic parsing for educational content
			doc.Find("a[href]").Each(func(i int, sel *goquery.Selection) {
				if len(allResources) >= 4 { // Limit total results
					return
				}

				href, exists := sel.Attr("href")
				if !exists || strings.HasPrefix(href, "#") {
					return
				}

				text := strings.TrimSpace(sel.Text())
				if len(text) < 10 || len(text) > 200 {
					return
				}

				// Check if content is relevant
				lowerText := strings.ToLower(text)
				lowerConcept := strings.ToLower(conceptName)
				if !strings.Contains(lowerText, lowerConcept) {
					return
				}

				fullURL := s.makeAbsoluteURL(fmt.Sprintf("https://%s", site.domain), href)

				resource := EducationalResource{
					ConceptID:       conceptID,
					ConceptName:     conceptName,
					Title:           text,
					URL:             fullURL,
					Description:     fmt.Sprintf("Educational content about %s", conceptName),
					ResourceType:    "article",
					SourceDomain:    site.domain,
					DifficultyLevel: "intermediate",
					QualityScore:    site.quality,
					ContentPreview:  text,
					ScrapedAt:       time.Now(),
					Language:        "en",
					Tags:            []string{"article", "education"},
					IsVerified:      false,
				}

				allResources = append(allResources, resource)
			})
		}()

		// Rate limiting between sites
		time.Sleep(time.Second)
	}

	return allResources, nil
}

// deduplicateResources removes duplicate resources
func (s *EducationalWebScraper) deduplicateResources(resources []EducationalResource) []EducationalResource {
	seen := make(map[string]bool)
	var unique []EducationalResource

	for _, resource := range resources {
		// Use URL as primary deduplication key
		if seen[resource.URL] {
			continue
		}

		// Also check for similar titles
		titleKey := strings.ToLower(strings.TrimSpace(resource.Title))
		duplicate := false
		for _, existing := range unique {
			existingTitleKey := strings.ToLower(strings.TrimSpace(existing.Title))
			if s.similarity(titleKey, existingTitleKey) > 0.8 {
				duplicate = true
				break
			}
		}

		if !duplicate {
			seen[resource.URL] = true
			unique = append(unique, resource)
		}
	}

	s.logger.Info("Deduplicated resources",
		zap.Int("original", len(resources)),
		zap.Int("unique", len(unique)))

	return unique
}

// filterQualityResources filters resources based on quality
func (s *EducationalWebScraper) filterQualityResources(resources []EducationalResource) []EducationalResource {
	var filtered []EducationalResource
	conceptCounts := make(map[string]map[string]int) // concept_id -> resource_type -> count

	// Sort by quality score descending
	sortedResources := make([]EducationalResource, len(resources))
	copy(sortedResources, resources)

	// Simple bubble sort by quality score (descending)
	for i := 0; i < len(sortedResources)-1; i++ {
		for j := 0; j < len(sortedResources)-i-1; j++ {
			if sortedResources[j].QualityScore < sortedResources[j+1].QualityScore {
				sortedResources[j], sortedResources[j+1] = sortedResources[j+1], sortedResources[j]
			}
		}
	}

	for _, resource := range sortedResources {
		// Filter minimum quality threshold
		if resource.QualityScore < 0.4 {
			continue
		}

		conceptID := resource.ConceptID
		resourceType := resource.ResourceType

		if conceptCounts[conceptID] == nil {
			conceptCounts[conceptID] = make(map[string]int)
		}

		counts := conceptCounts[conceptID]

		// Limit total resources per concept
		totalCount := 0
		for _, count := range counts {
			totalCount += count
		}
		if totalCount >= 6 {
			continue
		}

		// Ensure diversity of resource types
		if resourceType == "video" && counts["video"] >= 3 {
			continue
		}
		if (resourceType == "article" || resourceType == "tutorial") && counts["article"]+counts["tutorial"] >= 3 {
			continue
		}

		filtered = append(filtered, resource)
		counts[resourceType]++
	}

	s.logger.Info("Quality filtered resources",
		zap.Int("original", len(resources)),
		zap.Int("filtered", len(filtered)))

	return filtered
}

// Utility functions

// makeAbsoluteURL makes a relative URL absolute
func (s *EducationalWebScraper) makeAbsoluteURL(baseURL, relativeURL string) string {
	if strings.HasPrefix(relativeURL, "http") {
		return relativeURL
	}

	if strings.HasPrefix(relativeURL, "/") {
		return baseURL + relativeURL
	}

	return baseURL + "/" + relativeURL
}

// truncateString truncates a string to a maximum length
func (s *EducationalWebScraper) truncateString(str string, maxLength int) string {
	if len(str) <= maxLength {
		return str
	}

	// Try to truncate at word boundary
	if maxLength > 0 {
		truncated := str[:maxLength]
		if lastSpace := strings.LastIndex(truncated, " "); lastSpace > maxLength/2 {
			return truncated[:lastSpace] + "..."
		}
		return truncated + "..."
	}

	return ""
}

// similarity calculates simple string similarity (Jaccard similarity)
func (s *EducationalWebScraper) similarity(str1, str2 string) float64 {
	words1 := strings.Fields(str1)
	words2 := strings.Fields(str2)

	set1 := make(map[string]bool)
	for _, word := range words1 {
		set1[word] = true
	}

	set2 := make(map[string]bool)
	for _, word := range words2 {
		set2[word] = true
	}

	intersection := 0
	for word := range set1 {
		if set2[word] {
			intersection++
		}
	}

	union := len(set1) + len(set2) - intersection
	if union == 0 {
		return 0.0
	}

	return float64(intersection) / float64(union)
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// maskConnectionString masks sensitive information in connection strings for logging
func maskConnectionString(uri string) string {
	if strings.Contains(uri, "@") {
		parts := strings.Split(uri, "@")
		if len(parts) >= 2 && strings.Contains(parts[0], ":") {
			userParts := strings.Split(parts[0], ":")
			if len(userParts) >= 3 {
				userParts[len(userParts)-1] = "***"
				parts[0] = strings.Join(userParts, ":")
			}
		}
		return strings.Join(parts, "@")
	}
	return uri
}
