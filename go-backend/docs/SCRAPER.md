# Educational Web Scraper

A high-performance Go web scraper for finding and storing educational mathematics resources from various online platforms.

## Features

### 🚀 **High Performance**
- **Concurrent Processing**: Scrapes multiple concepts simultaneously with configurable concurrency limits
- **Rate Limiting**: Built-in rate limiting to respect websites' servers (3 req/sec default)
- **Connection Pooling**: Optimized HTTP client with connection reuse
- **Batch Processing**: Processes concepts in batches to manage memory and performance

### 🎯 **Multi-Platform Support**
- **YouTube**: Educational video discovery with quality scoring
- **Khan Academy**: High-quality tutorial extraction
- **Wolfram MathWorld**: Mathematical reference materials
- **Educational Sites**: Brilliant.org, Math is Fun, and more

### 📊 **Smart Quality Assessment**
- **Content Analysis**: Evaluates educational value and relevance
- **Difficulty Classification**: Automatically classifies as beginner/intermediate/advanced
- **Quality Scoring**: 0.0-1.0 scoring based on source credibility and content quality
- **Deduplication**: Removes duplicate resources across platforms

### 💾 **MongoDB Integration**
- **Efficient Storage**: Bulk upsert operations with proper indexing
- **Rich Metadata**: Stores comprehensive resource information
- **Statistics**: Real-time scraping statistics and analytics

## Installation

### Prerequisites

```bash
# Install dependencies
go mod download

# Start MongoDB
docker-compose up mongodb -d
```

### Environment Variables

```bash
# MongoDB Configuration
export MONGODB_URI="mongodb://localhost:27017"
export SCRAPER_DB_NAME="mathprereq"
export SCRAPER_COLLECTION="educational_resources"

# Scraper Configuration
export SCRAPER_MAX_CONCURRENT="8"        # Max concurrent requests
export SCRAPER_TIMEOUT_SECONDS="30"      # Request timeout
export SCRAPER_RATE_LIMIT="3.0"         # Requests per second
```

## Usage

### Basic Scraping

```bash
# Scrape all concepts from Neo4j
make scrape

# Or run directly
go run ./cmd/scraper
```

### Scrape Specific Concepts

```bash
# Scrape specific concepts
make scrape-concepts CONCEPTS="derivatives integration limits"

# Or run directly
go run ./cmd/scraper --concepts "derivatives" "integration" "limits"
```

### Docker Usage

```bash
# Run full environment with MongoDB
docker-compose up -d

# Run scraper in container (when implemented)
docker-compose exec api go run ./cmd/scraper
```

## Resource Data Structure

Each scraped resource contains:

```go
type EducationalResource struct {
    ID              string    `json:"id"`
    ConceptID       string    `json:"concept_id"`       // "derivatives", "integration"
    ConceptName     string    `json:"concept_name"`     // "Derivatives", "Integration"
    Title           string    `json:"title"`            // Resource title
    URL             string    `json:"url"`              // Resource URL
    Description     string    `json:"description"`      // Resource description
    ResourceType    string    `json:"resource_type"`    // video, article, tutorial
    SourceDomain    string    `json:"source_domain"`    // youtube.com, khanacademy.org
    DifficultyLevel string    `json:"difficulty_level"` // beginner, intermediate, advanced
    QualityScore    float64   `json:"quality_score"`    // 0.0 to 1.0
    ContentPreview  string    `json:"content_preview"`  // Preview text
    ScrapedAt       time.Time `json:"scraped_at"`       // When scraped
    Language        string    `json:"language"`         // en, es, etc.
    
    // Video-specific fields
    Duration        *string   `json:"duration,omitempty"`
    ThumbnailURL    *string   `json:"thumbnail_url,omitempty"`
    ViewCount       *int64    `json:"view_count,omitempty"`
    AuthorChannel   *string   `json:"author_channel,omitempty"`
    
    // Metadata
    Tags           []string  `json:"tags"`
    IsVerified     bool      `json:"is_verified"`
    Rating         *float64  `json:"rating,omitempty"`
}
```

## Quality Scoring Algorithm

The scraper uses a sophisticated quality scoring system:

### YouTube Videos (0.0 - 1.0)
- **Base Score**: 0.5
- **Channel Reputation**: +0.3 for known educational channels
- **Title Quality**: +0.1 for descriptive titles with educational keywords
- **Duration**: +0.1 for optimal tutorial length (10-30 minutes)
- **View Count**: +0.1 for videos with >10k views

### Educational Websites
- **Khan Academy**: 0.9 (high quality, verified content)
- **MathWorld**: 0.8 (authoritative mathematical reference)
- **Brilliant.org**: 0.8 (interactive, well-structured content)
- **Math is Fun**: 0.7 (accessible explanations)

## Performance Optimization

### Concurrency Settings

```go
// Recommended settings by use case
type ScraperConfig struct {
    MaxConcurrentRequests: 8,    // Conservative for production
    RequestTimeout: 30s,         // Balance between speed and reliability
    RateLimit: 3.0,             // 3 requests per second
    MaxRetries: 3,              // Retry failed requests
    RetryDelay: 2s,             // Delay between retries
}
```

### Memory Management
- **Batch Processing**: Processes concepts in batches of 3
- **Connection Pooling**: Reuses HTTP connections efficiently  
- **Rate Limiting**: Prevents overwhelming target servers
- **Deduplication**: In-memory deduplication before database storage

## Monitoring and Statistics

### Real-time Statistics

```bash
# Example output
📊 Scraping Results:
⏱️  Duration: 2m30s
📚 Total Resources: 156
🧮 Concepts Covered: 23
⭐ Average Quality: 0.73
```

### MongoDB Queries

```javascript
// Get resources by concept
db.educational_resources.find({
  "concept_id": "derivatives",
  "quality_score": { $gte: 0.7 }
}).sort({ "quality_score": -1 })

// Get statistics
db.educational_resources.aggregate([
  {
    $group: {
      _id: "$concept_id",
      count: { $sum: 1 },
      avg_quality: { $avg: "$quality_score" }
    }
  }
])
```

## Error Handling and Resilience

### Circuit Breaker Pattern
- **Failure Threshold**: Stops scraping a source after 3 consecutive failures
- **Recovery Time**: 30-second cooldown before retry
- **Graceful Degradation**: Continues with other sources if one fails

### Retry Logic
- **Exponential Backoff**: Progressive delay between retries (2s, 4s, 8s)
- **Jitter**: Random variation to prevent thundering herd
- **Context Cancellation**: Respects timeout contexts

### Rate Limiting
- **Token Bucket**: Smooth rate limiting across all requests
- **Per-Site Limiting**: Additional delays between searches on same site
- **Batch Throttling**: Delays between concept batches

## Extending the Scraper

### Adding New Sources

```go
// Add new search function
func (s *EducationalWebScraper) searchNewSite(ctx context.Context, conceptID, conceptName string) ([]EducationalResource, error) {
    // Implement search logic
    // Return resources with quality scores
}

// Register in processBatch method
searchFunctions := []func(context.Context, string, string) ([]EducationalResource, error){
    s.searchYouTube,
    s.searchKhanAcademy,
    s.searchMathWorld,
    s.searchNewSite,  // Add here
}
```

### Custom Quality Scoring

```go
// Override quality calculation
func (s *EducationalWebScraper) calculateCustomQuality(resource EducationalResource) float64 {
    score := 0.5 // Base score
    
    // Add custom scoring logic
    if strings.Contains(resource.Title, "step-by-step") {
        score += 0.2
    }
    
    return min(score, 1.0)
}
```

## Troubleshooting

### Common Issues

**Connection Timeouts**
```bash
# Increase timeout
export SCRAPER_TIMEOUT_SECONDS="60"
```

**Rate Limiting Errors**
```bash
# Reduce rate limit
export SCRAPER_RATE_LIMIT="2.0"
```

**MongoDB Connection Issues**
```bash
# Check MongoDB status
docker-compose ps mongodb
docker-compose logs mongodb
```

### Debug Mode

```bash
# Enable debug logging
export MLF_LOGGING_LEVEL="debug"
go run ./cmd/scraper
```

## Best Practices

### Respectful Scraping
1. **Rate Limiting**: Never exceed 5 requests per second per domain
2. **User Agent**: Use descriptive, contact-able user agent
3. **Robots.txt**: Respect robots.txt when possible
4. **Caching**: Cache results to minimize repeated requests

### Data Quality
1. **Quality Thresholds**: Only store resources with quality_score >= 0.4
2. **Regular Updates**: Re-scrape concepts periodically (daily/weekly)
3. **Manual Review**: Periodically review high-quality resources
4. **User Feedback**: Incorporate user ratings into quality scores

### Performance
1. **Batch Size**: Process 3-5 concepts per batch
2. **Concurrency**: Use 5-10 concurrent requests maximum
3. **Monitoring**: Track success rates and performance metrics
4. **Cleanup**: Regularly remove outdated or broken resources

## Future Enhancements

- [ ] **JavaScript Rendering**: Support for SPA websites
- [ ] **Content Analysis**: NLP-based content quality assessment
- [ ] **User Ratings**: Integration with user feedback system
- [ ] **Multilingual**: Support for non-English educational content
- [ ] **API Integration**: Direct integration with educational platform APIs
- [ ] **Real-time Updates**: WebSocket-based real-time scraping status
- [ ] **Machine Learning**: ML-based quality prediction models