# 🎓 Learning Resources API Documentation

## Overview
The Learning Resources API allows users to find, store, and retrieve educational resources for mathematical concepts. This feature uses web scraping to discover resources from educational platforms like YouTube, Khan Academy, MathWorld, and more.

## Base URL
```
http://localhost:8080/api/v1/resources
```

## Authentication
Currently no authentication required for resource endpoints.

## Endpoints

### 1. Find Resources for a Concept
**Trigger resource discovery for a specific concept**

```http
POST /api/v1/resources/find/{concept}
```

**Parameters:**
- `concept` (path parameter): The mathematical concept to find resources for

**Example Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/resources/find/derivatives" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Resource finding initiated. Check back in a few minutes for more results.",
  "resources": [
    {
      "id": "507f1f77bcf86cd799439011",
      "concept_id": "derivatives",
      "concept_name": "derivatives",
      "title": "Derivative Rules Explained",
      "url": "https://www.youtube.com/watch?v=example",
      "description": "Complete guide to derivative rules",
      "resource_type": "video",
      "source_domain": "youtube.com",
      "difficulty_level": "beginner",
      "quality_score": 0.85,
      "content_preview": "Learn the basic rules for finding derivatives...",
      "language": "en",
      "duration": "15:30",
      "author_channel": "Khan Academy",
      "tags": ["calculus", "derivatives", "tutorial"],
      "is_verified": true
    }
  ],
  "total_found": 1,
  "request_id": "req-12345"
}
```

### 2. Get Stored Resources for a Concept
**Retrieve previously found resources for a concept**

```http
GET /api/v1/resources/concept/{concept}?limit=20
```

**Parameters:**
- `concept` (path parameter): The mathematical concept
- `limit` (query parameter, optional): Maximum number of resources to return (default: 20)

**Example Request:**
```bash
curl "http://localhost:8080/api/v1/resources/concept/integration?limit=10"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Resources retrieved successfully",
  "resources": [
    {
      "id": "507f1f77bcf86cd799439012",
      "concept_id": "integration",
      "concept_name": "integration",
      "title": "Integration Techniques - Khan Academy",
      "url": "https://www.khanacademy.org/math/calculus/integration",
      "description": "Learn various integration techniques step by step",
      "resource_type": "tutorial",
      "source_domain": "khanacademy.org",
      "difficulty_level": "intermediate",
      "quality_score": 0.92,
      "content_preview": "Master integration with practice problems...",
      "language": "en",
      "tags": ["calculus", "integration", "khan-academy"],
      "is_verified": true
    }
  ],
  "total_found": 1,
  "request_id": "req-12346"
}
```

### 3. Get Resource Statistics
**Get statistics about all stored resources**

```http
GET /api/v1/resources/stats
```

**Example Request:**
```bash
curl "http://localhost:8080/api/v1/resources/stats"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Resource statistics retrieved successfully",
  "stats": {
    "total_concepts": 25,
    "total_resources": 150,
    "avg_resources_per_concept": 6.0,
    "avg_quality_score": 0.78
  },
  "request_id": "req-12347"
}
```

### 4. Batch Find Resources
**Find resources for multiple concepts at once**

```http
POST /api/v1/resources/find-batch
```

**Request Body:**
```json
{
  "concept_names": ["derivatives", "integrals", "limits"],
  "limit": 10
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:8080/api/v1/resources/find-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "concept_names": ["derivatives", "integrals", "limits"],
    "limit": 10
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Batch resource finding initiated. This may take several minutes to complete.",
  "concepts_count": 3,
  "request_id": "req-12348"
}
```

### 5. List All Resources (Coming Soon)
**List all resources with pagination**

```http
GET /api/v1/resources/?page=1&limit=50
```

**Example Response:**
```json
{
  "success": true,
  "message": "Resource listing feature coming soon",
  "page": 1,
  "limit": 50,
  "request_id": "req-12349"
}
```

## Resource Object Schema

```json
{
  "id": "string (MongoDB ObjectID)",
  "concept_id": "string (normalized concept identifier)",
  "concept_name": "string (original concept name)",
  "title": "string (resource title)",
  "url": "string (resource URL)",
  "description": "string (resource description)",
  "resource_type": "string (video|article|tutorial|reference|practice)",
  "source_domain": "string (youtube.com, khanacademy.org, etc.)",
  "difficulty_level": "string (beginner|intermediate|advanced)",
  "quality_score": "number (0.0 to 1.0)",
  "content_preview": "string (preview text)",
  "scraped_at": "datetime (when resource was scraped)",
  "language": "string (en, es, etc.)",
  "duration": "string (optional, for videos)",
  "thumbnail_url": "string (optional, for videos)",
  "view_count": "number (optional, for videos)",
  "rating": "number (optional)",
  "author_channel": "string (optional, channel/author name)",
  "published_at": "datetime (optional)",
  "tags": "array of strings",
  "is_verified": "boolean (verified educational source)"
}
```

## Supported Educational Platforms

The resource finder searches across these platforms:

- **YouTube** - Educational videos from verified channels
- **Khan Academy** - Structured tutorials and lessons  
- **Wolfram MathWorld** - Mathematical definitions and references
- **Brilliant.org** - Interactive problem solving
- **Math is Fun** - Simple explanations and examples

## Usage Examples

### Frontend Button Implementation
```javascript
async function findResourcesForConcept(conceptName) {
  // 1. Trigger resource discovery
  const findResponse = await fetch(`/api/v1/resources/find/${conceptName}`, {
    method: 'POST'
  });
  const findResult = await findResponse.json();
  
  // 2. Show immediate results
  displayResources(findResult.resources);
  
  // 3. Wait and get updated results
  setTimeout(async () => {
    const getResponse = await fetch(`/api/v1/resources/concept/${conceptName}`);
    const getResult = await getResponse.json();
    displayResources(getResult.resources);
  }, 10000);
}
```

### Concept Integration
```javascript
// After showing concept details, add a "Find Resources" button
function addResourceButton(conceptName) {
  const button = document.createElement('button');
  button.textContent = 'Find Learning Resources';
  button.onclick = () => findResourcesForConcept(conceptName);
  document.getElementById('concept-actions').appendChild(button);
}
```

## Rate Limiting & Performance

- **Single concept search**: ~5-10 seconds for initial results
- **Batch search**: ~30-60 seconds for multiple concepts  
- **Rate limiting**: 2 requests/second to external sites
- **Caching**: Resources cached for 24 hours to avoid re-scraping

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "request_id": "req-12350"
}
```

Common HTTP status codes:
- `200` - Success
- `202` - Accepted (for batch operations)
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error (system error)

## Development Setup

1. **Start the services:**
```bash
make docker-up  # Start MongoDB
make dev        # Start the server
```

2. **Open the demo page:**
```bash
# Open web/resources-demo.html in your browser
# Or serve it via HTTP server:
cd web && python3 -m http.server 8000
```

3. **Test API endpoints:**
```bash
# Health check
curl http://localhost:8080/api/v1/health

# Find resources for derivatives
curl -X POST http://localhost:8080/api/v1/resources/find/derivatives

# Get stored resources
curl http://localhost:8080/api/v1/resources/concept/derivatives
```