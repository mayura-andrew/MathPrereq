# Learning Resources API Integration Guide

## Overview
The Learning Resources API provides a standalone service for finding educational resources for mathematical concepts. It integrates with the web scraper and MongoDB to provide curated learning materials.

## API Endpoints

### 1. Find Learning Resources
**POST** `/api/v1/learning-resources/find`

Find or scrape learning resources for a specific concept.

#### Request Body:
```json
{
  "concept_name": "derivatives",           // Required: Name of the concept
  "concept_id": "derivative",              // Optional: Alternative concept ID
  "resource_types": ["video", "tutorial"], // Optional: Filter by resource types
  "difficulty_level": "beginner",         // Optional: beginner, intermediate, advanced
  "limit": 10,                            // Optional: Max number of resources (default: 10)
  "force_refresh": false                  // Optional: Force scraping even if resources exist
}
```

#### Response:
```json
{
  "success": true,
  "concept_name": "derivatives",
  "concept_id": "derivatives",
  "total_resources": 8,
  "scraping_triggered": false,
  "last_updated": "2024-01-15T10:30:00Z",
  "resources": [
    {
      "id": "...",
      "concept_id": "derivatives",
      "concept_name": "derivatives",
      "title": "Derivatives Explained - Khan Academy",
      "url": "https://www.khanacademy.org/...",
      "description": "Learn about derivatives...",
      "resource_type": "tutorial",
      "source_domain": "khanacademy.org",
      "difficulty_level": "beginner",
      "quality_score": 0.9,
      "content_preview": "...",
      "scraped_at": "2024-01-15T10:30:00Z",
      "language": "en",
      "duration": "15:30",
      "thumbnail_url": "https://...",
      "author_channel": "Khan Academy",
      "tags": ["calculus", "derivatives"],
      "is_verified": true
    }
  ]
}
```

### 2. Get Learning Resources Statistics
**GET** `/api/v1/learning-resources/stats`

Get statistics about the learning resources database.

#### Response:
```json
{
  "success": true,
  "stats": {
    "total_concepts": 25,
    "total_resources": 150,
    "avg_resources_per_concept": 6.0,
    "avg_quality_score": 0.75
  }
}
```

## Frontend Integration Examples

### React/JavaScript Example:

```javascript
// Find learning resources for a concept
async function findLearningResources(conceptName, options = {}) {
  const requestBody = {
    concept_name: conceptName,
    limit: options.limit || 10,
    resource_types: options.resourceTypes,
    difficulty_level: options.difficultyLevel,
    force_refresh: options.forceRefresh || false
  };

  try {
    const response = await fetch('/api/v1/learning-resources/find', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        resources: data.resources,
        totalCount: data.total_resources,
        scrapingTriggered: data.scraping_triggered,
        lastUpdated: data.last_updated
      };
    } else {
      throw new Error(data.error || 'Failed to find resources');
    }
  } catch (error) {
    console.error('Error finding learning resources:', error);
    throw error;
  }
}

// Usage examples:
findLearningResources('derivatives')
  .then(result => {
    console.log('Found resources:', result.resources);
    if (result.scrapingTriggered) {
      console.log('New resources are being scraped...');
    }
  });

findLearningResources('integration', {
  resourceTypes: ['video'],
  difficultyLevel: 'beginner',
  limit: 5
});
```

### React Component Example:

```jsx
import React, { useState, useEffect } from 'react';

const LearningResourcesFinder = ({ conceptName }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scrapingTriggered, setScrapingTriggered] = useState(false);
  const [filters, setFilters] = useState({
    resourceTypes: [],
    difficultyLevel: '',
    limit: 10
  });

  const findResources = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const result = await findLearningResources(conceptName, {
        ...filters,
        forceRefresh
      });
      
      setResources(result.resources);
      setScrapingTriggered(result.scrapingTriggered);
      
      if (result.scrapingTriggered) {
        // Poll for updates after scraping
        setTimeout(() => findResources(), 10000);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conceptName) {
      findResources();
    }
  }, [conceptName]);

  return (
    <div className="learning-resources">
      <div className="header">
        <h3>Learning Resources for {conceptName}</h3>
        <button 
          onClick={() => findResources(true)}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh Resources'}
        </button>
      </div>

      {scrapingTriggered && (
        <div className="scraping-notice">
          🕷️ Finding new resources... Results will update automatically.
        </div>
      )}

      <div className="filters">
        <select 
          value={filters.difficultyLevel}
          onChange={(e) => setFilters({...filters, difficultyLevel: e.target.value})}
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div className="resources-list">
        {resources.map(resource => (
          <div key={resource.id} className="resource-card">
            <h4>{resource.title}</h4>
            <p>{resource.description}</p>
            <div className="resource-meta">
              <span className="type">{resource.resource_type}</span>
              <span className="source">{resource.source_domain}</span>
              <span className="quality">Quality: {(resource.quality_score * 100).toFixed(0)}%</span>
            </div>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              View Resource
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "concept_name": "derivatives",
  "total_resources": 0,
  "resources": []
}
```

Common error scenarios:
- Missing or invalid concept_name
- Learning resources service unavailable
- MongoDB connection issues
- Scraping service failures

## Response Headers

The API includes helpful response headers:
- `X-Processing-Time`: Request processing duration
- `X-Resources-Count`: Number of resources returned
- `X-Scraping-Status`: "triggered" if new scraping was initiated

## Performance Considerations

1. **Caching**: Resources are cached in MongoDB to avoid repeated scraping
2. **Async Scraping**: New scraping happens in background to maintain fast response times
3. **Rate Limiting**: Built-in rate limiting prevents overwhelming external educational sites
4. **Quality Filtering**: Only high-quality resources (score ≥ 0.4) are returned

## Testing

Run the test suite:
```bash
make test-learning-resources
```

This will test all endpoints and verify the integration with MongoDB and the scraping service.