package entities

import "time"

// StreamEvent represents a single event in the streaming response
type StreamEvent struct {
	Type      StreamEventType `json:"type"`
	Data      interface{}     `json:"data"`
	Timestamp time.Time       `json:"timestamp"`
	QueryID   string          `json:"query_id,omitempty"`
}

// StreamEventType defines the type of streaming event
type StreamEventType string

const (
	// EventTypeStart indicates the query processing has started
	EventTypeStart StreamEventType = "start"

	// EventTypeConcepts indicates concepts have been identified
	EventTypeConcepts StreamEventType = "concepts"

	// EventTypePrerequisites indicates prerequisites have been found
	EventTypePrerequisites StreamEventType = "prerequisites"

	// EventTypeContext indicates vector context has been retrieved
	EventTypeContext StreamEventType = "context"

	// EventTypeResources indicates learning resources have been found
	EventTypeResources StreamEventType = "resources"

	// EventTypeExplanationChunk indicates a chunk of the explanation
	EventTypeExplanationChunk StreamEventType = "explanation_chunk"

	// EventTypeExplanationComplete indicates explanation is complete
	EventTypeExplanationComplete StreamEventType = "explanation_complete"

	// EventTypeError indicates an error occurred
	EventTypeError StreamEventType = "error"

	// EventTypeComplete indicates the entire query is complete
	EventTypeComplete StreamEventType = "complete"

	// EventTypeProgress indicates progress update
	EventTypeProgress StreamEventType = "progress"
)

// StreamStartData contains the initial query information
type StreamStartData struct {
	QueryID   string    `json:"query_id"`
	Question  string    `json:"question"`
	UserID    string    `json:"user_id,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// StreamConceptsData contains identified concepts
type StreamConceptsData struct {
	Concepts []string `json:"concepts"`
	Count    int      `json:"count"`
}

// StreamPrerequisitesData contains prerequisite path information
type StreamPrerequisitesData struct {
	Prerequisites []ConceptInfo `json:"prerequisites"`
	Count         int           `json:"count"`
}

// ConceptInfo is a lightweight concept representation for streaming
type ConceptInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

// StreamContextData contains vector search context
type StreamContextData struct {
	Chunks []string `json:"chunks"`
	Count  int      `json:"count"`
}

// StreamResourcesData contains learning resources
type StreamResourcesData struct {
	Resources []ResourceInfo `json:"resources"`
	Count     int            `json:"count"`
}

// ResourceInfo is a lightweight resource representation
type ResourceInfo struct {
	Title       string `json:"title"`
	URL         string `json:"url"`
	Type        string `json:"type"`
	Description string `json:"description,omitempty"`
}

// StreamExplanationChunkData contains a chunk of the explanation
type StreamExplanationChunkData struct {
	Chunk      string `json:"chunk"`
	TotalChars int    `json:"total_chars"`
}

// StreamExplanationCompleteData contains the final explanation
type StreamExplanationCompleteData struct {
	FullExplanation string `json:"full_explanation"`
	TotalLength     int    `json:"total_length"`
}

// StreamErrorData contains error information
type StreamErrorData struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

// StreamCompleteData contains final query statistics
type StreamCompleteData struct {
	QueryID        string        `json:"query_id"`
	ProcessingTime time.Duration `json:"processing_time"`
	TotalConcepts  int           `json:"total_concepts"`
	TotalChunks    int           `json:"total_chunks"`
	Success        bool          `json:"success"`
}

// StreamProgressData contains progress updates
type StreamProgressData struct {
	Stage       string  `json:"stage"`
	Percentage  float64 `json:"percentage"`
	Message     string  `json:"message"`
	CurrentStep int     `json:"current_step"`
	TotalSteps  int     `json:"total_steps"`
}
