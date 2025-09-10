# Query Analytics System

This system automatically saves all user queries and their responses to MongoDB for analytics and improvement purposes.

## Features

- **Automatic Query Logging**: Every user query is automatically saved to MongoDB
- **Comprehensive Data Storage**: Stores query, concepts, prerequisites, context, explanation, and metadata
- **Asynchronous Saving**: Query processing is not blocked by database operations
- **Analytics Endpoints**: REST API endpoints to retrieve query statistics
- **Error Tracking**: Failed queries are also logged for debugging

## Data Structure

Each query is stored as a `QueryResponseRecord` with the following fields:

```go
type QueryResponseRecord struct {
    ID                  primitive.ObjectID `bson:"_id,omitempty"`
    UserID              string             `bson:"user_id,omitempty"`
    Query               string             `bson:"query"`
    IdentifiedConcepts  []string           `bson:"identified_concepts"`
    PrerequisitePath    []neo4j.Concept    `bson:"prerequisite_path"`
    RetrievedContext    []string           `bson:"retrieved_context"`
    Explanation         string             `bson:"explanation"`
    ResponseTime        time.Duration      `bson:"response_time"`
    ProcessingSuccess   bool               `bson:"processing_success"`
    ErrorMessage        string             `bson:"error_message,omitempty"`
    Timestamp           time.Time          `bson:"timestamp"`
    UserAgent           string             `bson:"user_agent,omitempty"`
    IPAddress           string             `bson:"ip_address,omitempty"`
    SessionID           string             `bson:"session_id,omitempty"`
    LLMProvider         string             `bson:"llm_provider"`
    LLMModel            string             `bson:"llm_model"`
    KnowledgeGraphHits  int                `bson:"knowledge_graph_hits"`
    VectorStoreHits     int                `bson:"vector_store_hits"`
}
```

## API Endpoints

### Get Query Analytics
```
GET /api/v1/analytics/queries
```

Returns comprehensive analytics about stored queries including:
- Total queries, success/failure rates
- Average response time
- Popular concepts
- Query trends over time

## Usage

The system works automatically - no additional configuration required. Every time a user makes a query through the `/api/v1/query` endpoint, the following happens:

1. Query is processed normally
2. Response is returned to user immediately
3. Query data is saved to MongoDB asynchronously
4. Analytics can be retrieved via the analytics endpoint

## Testing

Run the query analytics test:

```bash
make test-query-analytics
```

This will verify that:
- MongoDB connection is working
- Collection exists and is accessible
- CRUD operations work correctly
- Analytics queries function properly

## Benefits

1. **Performance Monitoring**: Track response times and system performance
2. **User Behavior Analysis**: Understand what concepts users are asking about
3. **System Improvement**: Identify common failure patterns
4. **Content Optimization**: See which explanations work best
5. **Debugging**: Historical query data for troubleshooting

## Privacy Considerations

- No personally identifiable information is stored by default
- UserID, IPAddress, and UserAgent are optional fields
- SessionID can be used for anonymous session tracking
- All data is stored securely in MongoDB with authentication