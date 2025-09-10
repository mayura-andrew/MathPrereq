package entities

import (
    "time"
    "github.com/google/uuid"
    "github.com/mathprereq/internal/types"
)

type Query struct {
    ID                 string                `json:"id" bson:"_id"`
    UserID             string                `json:"user_id,omitempty" bson:"user_id,omitempty"`
    Text               string                `json:"text" bson:"text"`
    IdentifiedConcepts []string              `json:"identified_concepts" bson:"identified_concepts"`
    PrerequisitePath   []types.Concept       `json:"prerequisite_path" bson:"prerequisite_path"`
    Response           QueryResponse         `json:"response" bson:"response"`
    Timestamp          time.Time             `json:"timestamp" bson:"timestamp"`
    ProcessingTimeMs   int64                 `json:"processing_time_ms" bson:"processing_time_ms"`
    Success            bool                  `json:"success" bson:"success"`
    ErrorMessage       string                `json:"error_message,omitempty" bson:"error_message,omitempty"`
    Metadata           QueryMetadata         `json:"metadata" bson:"metadata"`
}

type QueryResponse struct {
    Explanation      string   `json:"explanation" bson:"explanation"`
    RetrievedContext []string `json:"retrieved_context" bson:"retrieved_context"`
    LLMProvider      string   `json:"llm_provider" bson:"llm_provider"`
    LLMModel         string   `json:"llm_model" bson:"llm_model"`
    TokensUsed       int      `json:"tokens_used" bson:"tokens_used"`
}

type QueryMetadata struct {
    VectorHits        int               `json:"vector_hits" bson:"vector_hits"`
    GraphHits         int               `json:"graph_hits" bson:"graph_hits"`
    ProcessingSteps   []ProcessingStep  `json:"processing_steps" bson:"processing_steps"`
    RequestID         string            `json:"request_id" bson:"request_id"`
}

type ProcessingStep struct {
    Name      string        `json:"name" bson:"name"`
    Duration  time.Duration `json:"duration" bson:"duration"`
    Success   bool          `json:"success" bson:"success"`
    Error     string        `json:"error,omitempty" bson:"error,omitempty"`
}


// Constructor functions
func NewQuery(userID, text, requestID string) *Query {
    return &Query{
        ID:        uuid.New().String(),
        UserID:    userID,
        Text:      text,
        Timestamp: time.Now(),
        Success:   false,
        Metadata: QueryMetadata{
            RequestID:       requestID,
            ProcessingSteps: []ProcessingStep{},
        },
    }
}

// Methods
func (q *Query) AddProcessingStep(name string, duration time.Duration, success bool, err error) {
    step := ProcessingStep{
        Name:     name,
        Duration: duration,
        Success:  success,
    }
    if err != nil {
        step.Error = err.Error()
    }
    q.Metadata.ProcessingSteps = append(q.Metadata.ProcessingSteps, step)
}

func (q *Query) MarkCompleted(success bool, err error) {
    q.Success = success
    q.ProcessingTimeMs = time.Since(q.Timestamp).Milliseconds()
    if err != nil {
        q.ErrorMessage = err.Error()
    }
}