# Complete Learning Resources Integration

## 🎯 Overview

Your learning resources system is now fully integrated with the main API server. Here's how all the components work together:

```
┌─────────────────────────────────────────────────────────┐
│                 Integrated API Server                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Main API  │  │   Learning  │  │ Web Scraper │     │
│  │ (handlers)  │  │ Resources   │  │ (built-in)  │     │
│  │             │  │ Service     │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│                     MongoDB Storage                      │
│                (educational_resources)                   │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Key Components

### 1. **Web Scraper** (`scraper.go`)
- **Built into the main server** - no separate microservice needed
- Scrapes YouTube, Khan Academy, MathWorld, and other educational sites
- Quality scoring and difficulty assessment
- Rate limiting to respect educational sites
- MongoDB integration for storage

### 2. **Learning Resources Service** (`learning_resources.go`)
- Manages finding and storing educational resources
- Integrates with the web scraper
- Smart concept ID matching (handles variations like "derivative" vs "derivatives")
- Background scraping for better user experience
- Quality filtering (only stores resources with score ≥ 0.4)

### 3. **API Handlers** (`handlers.go`)
- `POST /api/v1/learning-resources/find` - Find/scrape resources for a concept
- `POST /api/v1/trigger-scraping` - Manually trigger scraping
- `GET /api/v1/learning-resources/stats` - Get statistics
- Integration with main query endpoint

## 🚀 Quick Start

### Start the Server
```bash
# Start everything at once
make start-integrated

# Or manually:
make mongodb-up
go run ./cmd/server
```

### Test the Complete System
```bash
# Run comprehensive tests
make test-complete

# Or test specific parts:
make test-integrated-api
```

## 📡 API Usage Examples

### Find Learning Resources
```bash
curl -X POST http://localhost:8000/api/v1/learning-resources/find \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "derivatives",
    "resource_types": ["video", "tutorial"],
    "difficulty_level": "beginner",
    "limit": 5
  }'
```

**Response:**
```json
{
  "success": true,
  "concept_name": "derivatives",
  "total_resources": 5,
  "resources": [
    {
      "title": "Derivatives Explained - Khan Academy",
      "url": "https://www.khanacademy.org/...",
      "resource_type": "tutorial",
      "source_domain": "khanacademy.org",
      "quality_score": 0.9,
      "difficulty_level": "beginner"
    }
  ],
  "scraping_triggered": false
}
```

### Trigger Manual Scraping
```bash
curl -X POST http://localhost:8000/api/v1/trigger-scraping \
  -H "Content-Type: application/json" \
  -d '{
    "concept_name": "integration by parts"
  }'
```

### Get Statistics
```bash
curl http://localhost:8000/api/v1/learning-resources/stats
```

## 🧠 How It Works

### 1. **Resource Discovery Flow**
```
User Request → Check MongoDB → If empty/force_refresh → Trigger Scraper → Store Results → Return Resources
```

### 2. **Smart Concept Matching**
The system tries multiple concept ID variations:
- `derivatives` → `derivative`, `differentiation`
- `limits` → `limit`
- `integration` → `integral`, `integrals`

### 3. **Quality Scoring**
- **YouTube Videos**: Based on channel reputation, views, duration
- **Educational Sites**: Khan Academy (0.9), MathWorld (0.8), etc.
- **Filtering**: Only resources with quality ≥ 0.4 are stored

### 4. **Background Processing**
- Scraping happens asynchronously to avoid blocking API responses
- Users get immediate feedback when scraping is triggered
- Results appear in subsequent requests

## 📊 Data Flow

### Resource Scraping Process
1. **Request comes in** for concept (e.g., "derivatives")
2. **Check MongoDB** for existing resources
3. **If none found or force_refresh=true**:
   - Generate concept ID variations
   - Start background scraping (YouTube, Khan Academy, etc.)
   - Return immediate response indicating scraping started
4. **Scraper processes** multiple sources concurrently
5. **Quality filtering** removes low-quality resources
6. **Store in MongoDB** with deduplication
7. **Future requests** return cached, high-quality resources

### MongoDB Storage Structure
```javascript
{
  "_id": ObjectId("..."),
  "concept_id": "derivatives",
  "concept_name": "derivatives", 
  "title": "Derivative Rules Explained",
  "url": "https://youtube.com/watch?v=...",
  "resource_type": "video",
  "source_domain": "youtube.com",
  "quality_score": 0.85,
  "difficulty_level": "beginner",
  "scraped_at": ISODate("2024-01-15T10:30:00Z"),
  "author_channel": "Khan Academy",
  "view_count": 150000,
  "tags": ["calculus", "derivative", "tutorial"]
}
```

## 🎯 Key Features

### ✅ **Single Server Deployment**
- No microservices complexity
- Everything runs in one Go process
- Easy to deploy and manage

### ✅ **Intelligent Resource Discovery**
- Automatic scraping when resources are needed
- Manual trigger capability
- Smart concept name matching

### ✅ **Quality Assurance**
- Only stores high-quality educational content
- Prefers verified educational channels
- Filters by difficulty level and resource type

### ✅ **Performance Optimized**
- Background processing
- MongoDB indexing for fast queries
- Rate limiting to respect educational sites
- Connection pooling and efficient queries

### ✅ **Flexible API**
- RESTful endpoints
- Comprehensive filtering options
- Detailed response metadata
- Error handling and graceful degradation

## 🚨 Important Notes

1. **MongoDB Required**: Learning resources features need MongoDB running
2. **Respectful Scraping**: Built-in rate limiting and proper user agent
3. **Background Processing**: Scraping doesn't block API responses
4. **Quality Focused**: Only stores resources with quality score ≥ 0.4
5. **Graceful Fallback**: API works even if scraper fails

## 🔍 Troubleshooting

### Common Issues

**"Learning resources service not available"**
- Check if MongoDB is running: `make mongodb-up`
- Verify connection string in environment variables

**"No resources found"**
- Try triggering manual scraping: `POST /api/v1/trigger-scraping`
- Check MongoDB for stored resources
- Verify concept name spelling

**"Scraping not working"**
- Check internet connectivity
- Verify rate limiting isn't too aggressive
- Check logs for scraper errors

### Useful Commands
```bash
# Check MongoDB resources
make mongodb-shell
> db.educational_resources.find().limit(5)

# View server logs
# (logs will show scraping progress)

# Test specific concept
curl -X POST localhost:8000/api/v1/learning-resources/find \
  -H "Content-Type: application/json" \
  -d '{"concept_name": "your_concept", "force_refresh": true}'
```

Your integrated learning resources system is now complete and ready for production use! 🎉