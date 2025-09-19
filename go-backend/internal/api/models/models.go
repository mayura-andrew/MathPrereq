package models

import (
	"time"

	"github.com/mathprereq/internal/data/scraper"
)

type ErrorResponse struct {
	Success   bool      `json:"success"`
	Error     string    `json:"error"`
	RequestID string    `json:"request_id"`
	Timestamp time.Time `json:"timestamp"`
}

type QueryRequest struct {
	UserID   string `json:"user_id,omitempty" validate:"omitempty,uuid"`
	Question string `json:"question" validate:"required,min=3,max=1000"`
}

type QueryResponse struct {
	Success            bool          `json:"success"`
	Query              string        `json:"query"`
	IdentifiedConcepts []string      `json:"identified_concepts"`
	LearningPath       LearningPath  `json:"learning_path"`
	Explanation        string        `json:"explanation"`
	RetrievedContext   []string      `json:"retrieved_context,omitempty"`
	ProcessingTime     time.Duration `json:"processing_time"`
	ErrorMessage       *string       `json:"error_message,omitempty"`
	RequestID          string        `json:"request_id,omitempty"`
	Timestamp          time.Time     `json:"timestamp"`

	// Educational resources found for the concepts
	EducationalResources []scraper.EducationalResource `json:"educational_resources,omitempty"`
	ResourcesMessage     string                        `json:"resources_message,omitempty"`
}

// ConceptQueryRequest represents a smart concept query request
type ConceptQueryRequest struct {
	ConceptName string `json:"concept_name" binding:"required" validate:"required,min=2,max=100"`
	UserID      string `json:"user_iD,omitempty" validate:"max=50"`
}

// ConceptQueryResponse represents the response for concept queries
type ConceptQueryResponse struct {
	Success            bool           `json:"success"`
	ConceptName        string         `json:"concept_name"`
	Source             string         `json:"source"` // "cache" or "processed"
	IdentifiedConcepts []string       `json:"identified_concepts"`
	LearningPath       LearningPath   `json:"learning_path"`
	Explanation        string         `json:"explanation"`
	RetrievedContext   []string       `json:"retrieved_context,omitempty"`
	ProcessingTime     time.Duration  `json:"processing_time"`
	CacheAge           *time.Duration `json:"cache_age,omitempty"` // How old the cached data is
	ErrorMessage       *string        `json:"error_message,omitempty"`
	RequestID          string         `json:"request_id"`
	Timestamp          time.Time      `json:"timestamp"`

	// Educational resources
	EducationalResources []scraper.EducationalResource `json:"educational_resources,omitempty"`
	ResourcesMessage     string                        `json:"resources_message,omitempty"`
}

type ConceptDetailRequest struct {
	ConceptID string `json:"concept_id" validate:"required"`
}

type ConceptDetailResponse struct {
	Success             bool          `json:"success"`
	Concept             *ConceptInfo  `json:"concept,omitempty"`
	Prerequisites       []ConceptInfo `json:"prerequisites"`
	LeadsTo             []ConceptInfo `json:"leads_to"`
	DetailedExplanation string        `json:"detailed_explanation"`
	RequestID           string        `json:"request_id"`
	ErrorMessage        *string       `json:"error_message,omitempty"`
}

type ConceptInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
}

type LearningPath struct {
	Concepts      []ConceptInfo `json:"concepts"`
	TotalConcepts int           `json:"total_concepts"`
	PathType      string        `json:"path_type"`
}
