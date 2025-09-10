# Integrated Learning Resources API

## Overview
This is a single, integrated Go API server that combines:
- **Main API**: Query processing, concept details, learning paths
- **Web Scraper**: Built-in educational resource scraping (no separate service)
- **MongoDB**: Storage for scraped learning resources
- **Neo4j**: Knowledge graph for prerequisite relationships
- **Weaviate**: Vector database for semantic search
- **LLM Integration**: AI-powered explanations

## 🚀 Quick Start

### 1. Start the Integrated Server
```bash
make start-integrated
```

This will:
- Start MongoDB, Neo4j, and Weaviate
- Run database migrations
- Start the integrated API server with built-in web scraper

### 2. Test the System
```bash
make test-integrated-api
```

## 📡 API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `POST /api/v1/query` - Main query processing with learning paths
- `POST /api/v1/concept-detail` - Get concept details with prerequisites
- `GET /api/v1/concepts` - List all concepts

### Learning Resources Endpoints
- `POST /api/v1/learning-resources/find` - Find/scrape resources for a concept
- `GET /api/v1/learning-resources/stats` - Get resource statistics
- `POST /api/v1/trigger-scraping` - Manually trigger scraping

## 💡 Key Features

### 🕷️ Built-in Web Scraper
- **No separate service required** - scraper runs inside the main API
- Scrapes YouTube, Khan Academy, Math resources automatically
- Quality scoring and difficulty classification
- Background processing for better user experience

### 🎯 Intelligent Resource Finding
```javascript
// Find resources for a concept
const response = await fetch('/api/v1/learning-resources/find', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    concept_name: 'derivatives',
    difficulty_level: 'beginner',
    limit: 5
  })
});
```

### 🔄 Manual Scraping Triggers
```javascript
// Trigger scraping for new concepts
const response = await fetch('/api/v1/trigger-scraping', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    concept_name: 'integration by parts'
  })
});
```

## 🛠️ Development

### Start Development Environment
```bash
# Start MongoDB only
make mongodb-up

# Start all services
docker-compose up -d

# Run the server
go run ./cmd/server
```

### Environment Variables
```bash
# MongoDB (required for learning resources)
MONGODB_URI=mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin

# Scraper Configuration
SCRAPER_MAX_CONCURRENT=8
SCRAPER_RATE_LIMIT=3.0
SCRAPER_USER_AGENT="MathPrereqBot/1.0"

# LLM Configuration
GOOGLE_API_KEY=your_key_here
MLF_LLM_PROVIDER=gemini
MLF_LLM_MODEL=gemini-2.0-flash-exp
```

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Integrated API Server                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Main API  │  │Web Scraper  │  │ Learning    │     │
│  │ Endpoints   │  │(Built-in)   │  │ Resources   │     │
│  │             │  │             │  │ Service     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Neo4j     │  │  Weaviate   │  │  MongoDB    │     │
│  │(Knowledge   │  │  (Vector    │  │ (Learning   │     │
│  │ Graph)      │  │  Search)    │  │ Resources)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 🧪 Testing

### Test All Features
```bash
make test-integrated-api
```

### Test Specific Components
```bash
# Test MongoDB connection
make mongodb-test

# Test learning resources only
make test-learning-resources

# Test scraper
make scrape-concepts CONCEPTS="derivatives integration"
```

## 📈 Performance

- **Concurrent Scraping**: Processes multiple concepts simultaneously
- **Rate Limiting**: 3 requests/second to respect educational sites
- **Background Processing**: Non-blocking resource discovery
- **Quality Filtering**: Only stores resources with quality score ≥ 0.4
- **Smart Caching**: Avoids re-scraping recently updated concepts

## 🔧 Configuration

### Scraper Settings
```go
ScraperConfig{
    MaxConcurrentRequests: 8,          // Parallel concept processing
    RequestTimeout:        30 * time.Second,
    RateLimit:             3.0,        // Requests per second
    MaxRetries:            3,
    RetryDelay:            2 * time.Second,
}
```

### Quality Scoring
- **YouTube Videos**: 0.0-1.0 based on channel reputation, views, duration
- **Educational Sites**: Khan Academy (0.9), MathWorld (0.8), etc.
- **Filtering**: Only resources with score ≥ 0.4 are stored

## 🚨 Important Notes

1. **Single Server**: Everything runs in one Go process - no microservices complexity
2. **MongoDB Required**: Learning resources features need MongoDB running
3. **Respectful Scraping**: Built-in rate limiting and user agent identification
4. **Background Processing**: Scraping happens asynchronously for better UX
5. **Graceful Degradation**: API works even if MongoDB/scraper is unavailable

## 📚 Frontend Integration

```javascript
// Complete example
class LearningResourcesAPI {
  async findResources(conceptName, options = {}) {
    const response = await fetch('/api/v1/learning-resources/find', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        concept_name: conceptName,
        ...options
      })
    });
    
    const data = await response.json();
    
    if (data.scraping_triggered) {
      console.log('🕷️ New resources being scraped...');
      // Poll for updates or show loading indicator
    }
    
    return data.resources;
  }
  
  async triggerScraping(conceptName) {
    const response = await fetch('/api/v1/trigger-scraping', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({concept_name: conceptName})
    });
    
    return response.json();
  }
}
```

This integrated approach gives you a powerful, single-server solution that's easy to deploy and manage while providing comprehensive learning resource capabilities.