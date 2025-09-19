# 📡 **MathPrereq API Endpoints - Frontend Integration Guide**

[![API Version](https://img.shields.io/badge/API-v1.0-blue.svg)](https://docs.mathprereq.com)
[![Go Backend](https://img.shields.io/badge/Backend-Go-00ADD8.svg)](https://golang.org)

Complete API documentation for integrating your React frontend with the MathPrereq Go backend.

## 🏗️ **API Base Information**

### **Base URL**
```
Production:  https://api.mathprereq.com/api/v1
Development: http://localhost:8080/api/v1
```

### **Content Type**
```
Content-Type: application/json
```

### **Authentication**
- Currently: **None required**
- Future: JWT Bearer tokens planned

### **Rate Limiting**
- No explicit limits (consider adding for production)
- Request IDs automatically generated for tracking

---

## 🏥 **Health Check Endpoints**

### **GET /health** | **GET /api/v1/health**
**Basic health check for load balancers and monitoring**

- **Method**: `GET`
- **Timeout**: None
- **Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": "2h30m45s",
  "version": "1.0.0"
}
```

### **GET /api/v1/health-detailed**
**Detailed system health with all service statuses**

- **Method**: `GET`
- **Timeout**: None
- **Response**:
```json
{
  "overall_status": "healthy",
  "services": {
    "mongodb": {
      "status": "healthy",
      "uptime": "2h30m",
      "last_check": "2024-01-01T12:00:00Z",
      "details": {
        "connections": 15,
        "latency_ms": 2.3
      }
    },
    "neo4j": {
      "status": "healthy",
      "uptime": "2h30m",
      "last_check": "2024-01-01T12:00:00Z",
      "details": {
        "active_connections": 8,
        "store_size": "2.1GB"
      }
    },
    "weaviate": {
      "status": "healthy",
      "uptime": "2h30m",
      "last_check": "2024-01-01T12:00:00Z",
      "details": {
        "vector_count": 15432,
        "index_size": "1.8GB"
      }
    },
    "llm": {
      "status": "healthy",
      "uptime": "2h30m",
      "last_check": "2024-01-01T12:00:00Z",
      "details": {
        "provider": "gemini",
        "model": "gemini-pro",
        "requests_today": 1250
      }
    },
    "scraper": {
      "status": "healthy",
      "uptime": "2h30m",
      "last_check": "2024-01-01T12:00:00Z",
      "details": {
        "active_jobs": 2,
        "queue_size": 15
      }
    }
  },
  "repositories": {
    "concept_repository": {
      "status": "healthy",
      "response_time_ms": 15.2
    },
    "query_repository": {
      "status": "healthy",
      "response_time_ms": 8.7
    },
    "vector_repository": {
      "status": "healthy",
      "response_time_ms": 23.1
    }
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": "2h30m45s",
  "version": "1.0.0"
}
```

---

## 🤖 **Query Processing Endpoints**

### **POST /api/v1/query**
**Process general mathematical questions using LLM analysis**

- **Method**: `POST`
- **Timeout**: 45 seconds
- **Request Body**:
```json
{
  "question": "What is the derivative of x^2?",
  "context": "Optional additional context about calculus basics",
  "user_id": "optional_user_id_for_tracking"
}
```

- **Success Response** (200):
```json
{
  "success": true,
  "query": "What is the derivative of x^2?",
  "identified_concepts": ["derivatives", "power_rule", "functions"],
  "learning_path": {
    "concepts": [
      {
        "id": "concept-limits",
        "name": "Limits",
        "description": "Understanding limits is fundamental to derivatives...",
        "type": "prerequisite",
        "difficulty_level": "intermediate"
      },
      {
        "id": "concept-derivatives",
        "name": "Derivatives",
        "description": "Derivatives measure the rate of change of a function...",
        "type": "target",
        "difficulty_level": "intermediate"
      }
    ],
    "total_concepts": 2,
    "estimated_duration": "45 minutes",
    "difficulty_progression": "linear"
  },
  "explanation": "The derivative of x² is 2x. This follows from the power rule: d/dx[x^n] = n*x^(n-1). For n=2, we get 2*x^(2-1) = 2x.\n\nThe power rule is one of the fundamental rules of differentiation, along with the constant rule, sum rule, and product rule. Understanding derivatives is crucial for calculus and many applications in physics, engineering, and economics.",
  "retrieved_context": [
    "The power rule states that the derivative of x^n is n*x^(n-1)",
    "Derivatives represent instantaneous rate of change",
    "The derivative of a constant is zero"
  ],
  "processing_time": "2.34s",
  "llm_provider": "gemini",
  "llm_model": "gemini-pro",
  "tokens_used": 245,
  "confidence_score": 0.92,
  "request_id": "query-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

- **Error Response** (400/500):
```json
{
  "success": false,
  "error": "Question is required and cannot be empty",
  "error_code": "VALIDATION_ERROR",
  "details": {
    "field": "question",
    "reason": "Question cannot be empty"
  },
  "request_id": "query-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 🧠 **Smart Concept Query Endpoints**

### **POST /api/v1/concept-query**
**⭐ MAIN FEATURE: Smart concept analysis with MongoDB caching (90% cost reduction)**

- **Method**: `POST`
- **Timeout**: 3 minutes (allows for fresh LLM processing if needed)
- **Request Body**:
```json
{
  "concept_name": "derivatives",
  "user_id": "optional_user_id_for_tracking",
  "include_resources": true,
  "include_learning_path": true,
  "max_resources": 10
}
```

- **Cache Hit Response** (200) - ⚡ **150ms average**:
```json
{
  "success": true,
  "concept_name": "derivatives",
  "source": "cache",
  "identified_concepts": ["derivatives", "limits", "functions", "power_rule"],
  "learning_path": {
    "concepts": [
      {
        "id": "concept-limits",
        "name": "Limits",
        "description": "Foundation of calculus, understanding limits...",
        "type": "prerequisite",
        "difficulty_level": "intermediate",
        "tags": ["calculus", "convergence"]
      },
      {
        "id": "concept-derivatives",
        "name": "Derivatives",
        "description": "Rate of change, slope of tangent line...",
        "type": "target",
        "difficulty_level": "intermediate",
        "tags": ["calculus", "rate-of-change", "differentiation"]
      }
    ],
    "total_concepts": 5,
    "estimated_duration": "2 hours",
    "difficulty_progression": "linear",
    "completion_percentage": 0
  },
  "explanation": "Derivatives are fundamental to calculus and represent the instantaneous rate of change of a function. They have applications in physics (velocity, acceleration), economics (marginal cost), and engineering (optimization).\n\n**Key Concepts:**\n1. **Definition**: The derivative of f(x) is f'(x) = lim(h→0) [f(x+h) - f(x)]/h\n2. **Geometric Interpretation**: Slope of the tangent line to the curve\n3. **Physical Interpretation**: Instantaneous rate of change\n\n**Common Rules:**\n- Power Rule: d/dx[x^n] = n*x^(n-1)\n- Constant Rule: d/dx[c] = 0\n- Sum Rule: d/dx[f+g] = f' + g'\n\n**Applications:** Optimization problems, related rates, curve sketching, and differential equations.",
  "educational_resources": [
    {
      "id": "resource-youtube-456",
      "title": "Introduction to Derivatives - 3Blue1Brown",
      "url": "https://youtube.com/watch?v=example",
      "description": "Visual introduction to derivatives using geometric interpretations",
      "resource_type": "video",
      "platform": "youtube",
      "quality_score": 98,
      "difficulty_level": "beginner",
      "estimated_duration": "18 minutes",
      "language": "en",
      "thumbnail_url": "https://img.youtube.com/vi/example/maxresdefault.jpg",
      "author": "3Blue1Brown",
      "rating": 4.9,
      "view_count": 2500000,
      "tags": ["calculus", "derivatives", "visual", "intuitive"],
      "concept_ids": ["concept-derivatives", "concept-limits"],
      "created_at": "2024-01-01T10:30:00Z",
      "updated_at": "2024-01-01T10:30:00Z",
      "scraped_at": "2024-01-01T10:30:00Z",
      "last_verified": "2024-01-01T11:00:00Z"
    },
    {
      "id": "resource-khan-789",
      "title": "Derivative as a Concept",
      "url": "https://www.khanacademy.org/math/calculus-1",
      "description": "Comprehensive derivative introduction with interactive exercises",
      "resource_type": "interactive",
      "platform": "khan_academy",
      "quality_score": 95,
      "difficulty_level": "beginner",
      "estimated_duration": "45 minutes",
      "language": "en",
      "author": "Khan Academy",
      "rating": 4.7,
      "view_count": 500000,
      "tags": ["calculus", "derivatives", "interactive", "practice"],
      "concept_ids": ["concept-derivatives"],
      "created_at": "2024-01-01T10:35:00Z",
      "updated_at": "2024-01-01T10:35:00Z",
      "scraped_at": "2024-01-01T10:35:00Z"
    }
  ],
  "processing_time": "0.15s",
  "cache_age": "2h30m15s",
  "resources_message": "Found 12 high-quality educational resources",
  "request_id": "concept-1234567890",
  "timestamp": "2024-01-01T12:00:00Z",
  "_client_metadata": {
    "request_time": "2024-01-01T12:00:00.000Z",
    "response_size": 15432,
    "cached": true
  },
  "_performance": {
    "client_duration_ms": 150,
    "server_processing_time": "0.15s",
    "total_concepts": 5,
    "resource_count": 12,
    "cache_hit": true
  }
}
```

- **Fresh Processing Response** (200) - 🤖 **15-30s average**:
```json
{
  "success": true,
  "concept_name": "topology",
  "source": "processed",
  "identified_concepts": ["topology", "sets", "metric_spaces", "continuity"],
  "learning_path": {
    "concepts": [
      {
        "id": "concept-sets",
        "name": "Set Theory",
        "description": "Foundation of topology, understanding sets and operations...",
        "type": "prerequisite",
        "difficulty_level": "beginner"
      }
    ],
    "total_concepts": 8,
    "estimated_duration": "4 hours",
    "difficulty_progression": "exponential"
  },
  "explanation": "Topology is the study of properties that are preserved under continuous deformations... [comprehensive explanation]",
  "educational_resources": [],
  "processing_time": "18.45s",
  "resources_message": "Educational resources are being gathered in the background",
  "request_id": "concept-0987654321",
  "timestamp": "2024-01-01T12:00:00Z",
  "_client_metadata": {
    "request_time": "2024-01-01T12:00:00.000Z",
    "response_size": 25680,
    "cached": false
  },
  "_performance": {
    "client_duration_ms": 18450,
    "server_processing_time": "18.45s",
    "total_concepts": 8,
    "resource_count": 0,
    "cache_hit": false
  }
}
```

- **Error Response** (400/500):
```json
{
  "success": false,
  "error": "Concept name is required",
  "error_code": "VALIDATION_ERROR",
  "details": {
    "field": "concept_name",
    "reason": "Concept name cannot be empty"
  },
  "request_id": "concept-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 📚 **Concept Management Endpoints**

### **POST /api/v1/concept-detail**
**Get detailed information about a specific concept and its relationships**

- **Method**: `POST`
- **Timeout**: 15 seconds
- **Request Body**:
```json
{
  "concept_id": "concept-derivatives",
  "include_relationships": true,
  "include_resources": true
}
```

- **Response**:
```json
{
  "success": true,
  "concept": {
    "id": "concept-derivatives",
    "name": "Derivatives",
    "description": "Derivatives measure the rate of change of a function with respect to its variable",
    "type": "target",
    "difficulty_level": "intermediate",
    "subject_area": "calculus",
    "tags": ["calculus", "differentiation", "rate-of-change"],
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T11:00:00Z",
    "metadata": {
      "prerequisites_count": 3,
      "leads_to_count": 5,
      "resource_count": 15
    }
  },
  "prerequisites": [
    {
      "id": "concept-limits",
      "name": "Limits",
      "description": "Understanding limits is essential for derivatives",
      "type": "prerequisite",
      "difficulty_level": "intermediate"
    }
  ],
  "leads_to": [
    {
      "id": "concept-integrals",
      "name": "Integrals",
      "description": "Integration is the reverse process of differentiation",
      "type": "next_concept",
      "difficulty_level": "advanced"
    }
  ],
  "detailed_explanation": "Derivatives are a fundamental concept in calculus that describe how a function changes as its input changes. They have both geometric and physical interpretations and are essential for understanding rates of change, optimization, and many physical phenomena.",
  "related_resources": [
    {
      "id": "resource-123",
      "title": "Derivative Rules",
      "resource_type": "article",
      "platform": "wikipedia",
      "quality_score": 85
    }
  ],
  "request_id": "detail-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **GET /api/v1/concepts**
**List all available concepts with pagination and filtering**

- **Method**: `GET`
- **Timeout**: 30 seconds
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
  - `difficulty`: Filter by difficulty ("beginner", "intermediate", "advanced", "expert")
  - `subject`: Filter by subject area ("algebra", "calculus", "geometry", etc.)
  - `type`: Filter by concept type ("prerequisite", "target", "related")
  - `search`: Search in concept names and descriptions
  - `tags`: Comma-separated list of tags to filter by

- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "concept-derivatives",
      "name": "Derivatives",
      "description": "Rate of change of a function",
      "type": "target",
      "difficulty_level": "intermediate",
      "subject_area": "calculus",
      "tags": ["calculus", "differentiation"],
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T11:00:00Z"
    },
    {
      "id": "concept-limits",
      "name": "Limits",
      "description": "Foundation of calculus",
      "type": "prerequisite",
      "difficulty_level": "intermediate",
      "subject_area": "calculus",
      "tags": ["calculus", "convergence"],
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  },
  "filters_applied": {
    "subject_area": "calculus",
    "difficulty_level": "intermediate"
  },
  "request_id": "list-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 📖 **Educational Resources Endpoints**

### **POST /api/v1/resources/find/{concept}**
**Find and scrape educational resources for a specific concept**

- **Method**: `POST`
- **Timeout**: 60 seconds
- **URL Parameter**: `concept` (URL-encoded concept name, e.g., "linear%20equations")
- **Request Body** (optional):
```json
{
  "platforms": ["youtube", "khan_academy", "brilliant"],
  "resource_types": ["video", "tutorial", "article"],
  "max_resources": 10,
  "quality_threshold": 70,
  "difficulty_level": "beginner"
}
```

- **Response**:
```json
{
  "success": true,
  "concept": "derivatives",
  "resources_found": 8,
  "resources_stored": 6,
  "resources": [
    {
      "id": "resource-youtube-456",
      "title": "Introduction to Derivatives",
      "url": "https://youtube.com/watch?v=example",
      "description": "Learn the basics of derivatives with clear examples",
      "resource_type": "video",
      "platform": "youtube",
      "quality_score": 92,
      "difficulty_level": "beginner",
      "estimated_duration": "15 minutes",
      "language": "en",
      "thumbnail_url": "https://img.youtube.com/vi/example/maxresdefault.jpg",
      "author": "Khan Academy",
      "rating": 4.8,
      "view_count": 1000000,
      "tags": ["calculus", "derivatives", "math"],
      "concept_ids": ["concept-derivatives"],
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z",
      "scraped_at": "2024-01-01T12:00:00Z",
      "last_verified": "2024-01-01T12:00:00Z"
    }
  ],
  "scraping_stats": {
    "total_searched": 12,
    "successful": 8,
    "failed": 4,
    "processing_time": "45.2s",
    "platforms_searched": ["youtube", "khan_academy", "brilliant"]
  },
  "request_id": "find-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **GET /api/v1/resources/concept/{concept}**
**Get stored educational resources for a specific concept**

- **Method**: `GET`
- **Timeout**: 15 seconds
- **URL Parameter**: `concept` (URL-encoded concept name)
- **Query Parameters**:
  - `limit`: Maximum resources to return (default: 20, max: 100)
  - `platform`: Filter by platform ("youtube", "khan_academy", etc.)
  - `resource_type`: Filter by type ("video", "article", etc.)
  - `min_quality`: Minimum quality score (0-100, default: 0)
  - `difficulty`: Filter by difficulty level
  - `sort_by`: Sort field ("quality_score", "rating", "view_count", "created_at")
  - `sort_order`: Sort order ("desc", "asc")

- **Response**:
```json
{
  "success": true,
  "concept": "derivatives",
  "resources": [
    {
      "id": "resource-youtube-456",
      "title": "Introduction to Derivatives",
      "url": "https://youtube.com/watch?v=example",
      "description": "Learn the basics of derivatives",
      "resource_type": "video",
      "platform": "youtube",
      "quality_score": 92,
      "difficulty_level": "beginner",
      "estimated_duration": "15 minutes",
      "author": "Khan Academy",
      "rating": 4.8,
      "view_count": 1000000,
      "tags": ["calculus", "derivatives"],
      "concept_ids": ["concept-derivatives"],
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T11:00:00Z"
    }
  ],
  "total_count": 15,
  "filters_applied": {
    "platform": "youtube",
    "min_quality": 80
  },
  "request_id": "get-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **GET /api/v1/resources**
**List all educational resources with advanced filtering and pagination**

- **Method**: `GET`
- **Timeout**: 30 seconds
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
  - `platform`: Filter by platform
  - `resource_type`: Filter by type
  - `concept`: Filter by associated concept name
  - `min_quality`: Minimum quality score (0-100)
  - `difficulty`: Filter by difficulty level
  - `search`: Search in titles and descriptions
  - `tags`: Comma-separated list of tags
  - `sort_by`: Sort field
  - `sort_order`: Sort order

- **Response**:
```json
{
  "success": true,
  "data": [...], // Array of educational resources
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "total_pages": 25,
    "has_next": true,
    "has_prev": false
  },
  "filters_applied": {
    "platform": "youtube",
    "min_quality": 80,
    "difficulty": "beginner"
  },
  "request_id": "list-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **GET /api/v1/resources/stats**
**Get comprehensive resource statistics and analytics**

- **Method**: `GET`
- **Timeout**: 15 seconds
- **Response**:
```json
{
  "success": true,
  "total_resources": 1250,
  "resources_by_platform": {
    "youtube": 450,
    "khan_academy": 320,
    "brilliant": 180,
    "coursera": 120,
    "mathworld": 95,
    "mathisfun": 85
  },
  "resources_by_type": {
    "video": 600,
    "tutorial": 250,
    "article": 200,
    "exercise": 150,
    "interactive": 50
  },
  "resources_by_difficulty": {
    "beginner": 400,
    "intermediate": 650,
    "advanced": 200
  },
  "average_quality_score": 82.5,
  "quality_distribution": {
    "excellent": 150, // 90-100
    "good": 450,      // 70-89
    "fair": 400,      // 50-69
    "poor": 250       // 0-49
  },
  "recent_scraping_stats": {
    "last_24h": 45,
    "last_7d": 320,
    "last_30d": 1200
  },
  "top_concepts": [
    {
      "concept_name": "derivatives",
      "resource_count": 25,
      "average_quality": 88.5,
      "last_updated": "2024-01-01T11:30:00Z"
    },
    {
      "concept_name": "integrals",
      "resource_count": 22,
      "average_quality": 85.2,
      "last_updated": "2024-01-01T11:25:00Z"
    }
  ],
  "scraping_performance": {
    "avg_scraping_time": "45.2s",
    "success_rate": 87.5,
    "most_active_platform": "youtube"
  },
  "request_id": "stats-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **POST /api/v1/resources/find-batch**
**Find educational resources for multiple concepts in a single batch operation**

- **Method**: `POST`
- **Timeout**: 120 seconds
- **Request Body**:
```json
{
  "concept_names": ["derivatives", "integrals", "limits"],
  "platforms": ["youtube", "khan_academy", "brilliant"],
  "resource_types": ["video", "tutorial"],
  "max_resources_per_concept": 5,
  "quality_threshold": 75,
  "difficulty_level": "intermediate"
}
```

- **Response**:
```json
{
  "success": true,
  "batch_id": "batch-1234567890",
  "results": [
    {
      "concept_name": "derivatives",
      "success": true,
      "resources_found": 8,
      "resources_stored": 6,
      "resources": [...],
      "processing_time": "42.3s",
      "error": null
    },
    {
      "concept_name": "integrals",
      "success": true,
      "resources_found": 5,
      "resources_stored": 4,
      "resources": [...],
      "processing_time": "38.7s",
      "error": null
    },
    {
      "concept_name": "limits",
      "success": false,
      "resources_found": 0,
      "resources_stored": 0,
      "resources": [],
      "processing_time": "5.2s",
      "error": "No resources found for this concept"
    }
  ],
  "summary": {
    "total_concepts": 3,
    "successful": 2,
    "failed": 1,
    "total_resources_found": 21,
    "total_resources_stored": 17,
    "average_processing_time": "28.7s",
    "overall_success_rate": 66.7
  },
  "request_id": "batch-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 🔧 **Debug Endpoints (Development Only)**

### **GET /debug/config**
**Get sanitized configuration for debugging**

- **Method**: `GET`
- **Environment**: Development only
- **Response**: Sanitized configuration object with sensitive data masked

### **GET /debug/health-check**
**Detailed health check for development**

- **Method**: `GET`
- **Environment**: Development only
- **Response**:
```json
{
  "health_status": {
    "mongodb": true,
    "neo4j": true,
    "weaviate": true,
    "llm": true,
    "scraper": true
  },
  "all_healthy": true,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **GET /debug/cached-concepts**
**Inspect cached concept queries for debugging**

- **Method**: `GET`
- **Environment**: Development only
- **Query Parameters**:
  - `limit`: Number of cached concepts to return (default: 20, max: 100)

- **Response**:
```json
{
  "cached_concepts": [
    {
      "id": "query-1234567890",
      "identified_concepts": ["derivatives", "limits", "functions"],
      "timestamp": "2024-01-01T11:30:00Z",
      "success": true,
      "explanation_length": 1250,
      "prerequisite_count": 3,
      "cache_age": "30m15s"
    },
    {
      "id": "query-0987654321",
      "identified_concepts": ["integrals", "antiderivatives"],
      "timestamp": "2024-01-01T11:25:00Z",
      "success": true,
      "explanation_length": 980,
      "prerequisite_count": 4,
      "cache_age": "35m22s"
    }
  ],
  "total_count": 15,
  "limit": 20,
  "cache_stats": {
    "total_cached": 47,
    "cache_hit_rate": 87.5,
    "average_cache_age": "2h15m",
    "oldest_cache": "5h30m",
    "newest_cache": "2m15s"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## 🚨 **Error Response Format**

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "error_code": "ERROR_CODE",
  "details": {
    "field": "field_name",
    "reason": "Specific reason for the error",
    "suggestion": "How to fix the error"
  },
  "request_id": "req-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### **Common Error Codes**

- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource or concept not found
- `TIMEOUT_ERROR`: Request timed out
- `RATE_LIMIT_ERROR`: Too many requests
- `INTERNAL_ERROR`: Server-side error
- `SERVICE_UNAVAILABLE`: External service unavailable

---

## 🔐 **Security & Headers**

### **CORS Configuration**
- **Allowed Origins**: Configurable (default: all for development)
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, X-Request-ID
- **Credentials**: Not required (for now)

### **Security Headers**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: default-src 'self'`

### **Request Tracking**
- **X-Request-ID**: Automatically generated for each request
- **Request Logging**: All requests logged with timing and metadata

---

## ⏱️ **Timeouts & Performance**

| Endpoint | Timeout | Expected Response Time | Notes |
|----------|---------|----------------------|-------|
| `/health` | None | < 100ms | Basic health check |
| `/api/v1/health-detailed` | None | < 500ms | Service health checks |
| `/api/v1/query` | 45s | 2-15s | LLM processing |
| `/api/v1/concept-query` | 3min | 150ms (cache) / 15-30s (fresh) | Smart caching |
| `/api/v1/concepts` | 30s | < 2s | Database query |
| `/api/v1/resources/find/*` | 60s | 30-45s | Web scraping |
| `/api/v1/resources/concept/*` | 15s | < 1s | Database query |
| `/api/v1/resources/stats` | 15s | < 2s | Analytics query |
| `/api/v1/resources/find-batch` | 120s | 60-90s | Batch processing |

---

## 📊 **Response Metadata**

All successful responses include:

```json
{
  "success": true,
  "request_id": "req-1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
  // ... endpoint-specific data
}
```

### **Request ID Tracking**
- Unique identifier for each request
- Used for debugging and support
- Included in logs and error responses
- Format: `req-{timestamp}-{random}`

---

## 🎯 **Frontend Integration Examples**

### **React Query Integration**

```typescript
import { useQuery } from '@tanstack/react-query';

const useConceptQuery = (conceptName: string) => {
  return useQuery({
    queryKey: ['concept', conceptName],
    queryFn: async () => {
      const response = await fetch('/api/v1/concept-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept_name: conceptName })
      });
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

### **Error Handling**

```typescript
const handleApiError = (error: any) => {
  if (!error.success) {
    switch (error.error_code) {
      case 'VALIDATION_ERROR':
        // Handle validation errors
        break;
      case 'TIMEOUT_ERROR':
        // Handle timeout errors
        break;
      default:
        // Handle other errors
        break;
    }
  }
};
```

### **Caching Strategy**

```typescript
// Leverage backend caching for better performance
const { data, isLoading } = useConceptQuery('derivatives');

// data.source will be 'cache' for instant responses
// or 'processed' for fresh LLM responses
```

---

## 🚀 **Quick Start for Frontend Developers**

1. **Base URL**: `http://localhost:8080/api/v1`
2. **Content-Type**: `application/json`
3. **Main Endpoint**: `POST /api/v1/concept-query` (with smart caching)
4. **Health Check**: `GET /health`
5. **No Authentication**: Required for current version

### **Essential Endpoints for MVP**
1. `POST /api/v1/concept-query` - Core concept exploration
2. `GET /api/v1/resources/concept/{concept}` - Educational resources
3. `GET /api/v1/health` - Health monitoring

This comprehensive API documentation provides everything your React frontend needs to integrate seamlessly with the MathPrereq backend! 🎉