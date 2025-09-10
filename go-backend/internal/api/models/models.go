package models

import (
	"time"

	"github.com/mathprereq/internal/data/scraper"
)

type QueryRequest struct {
	Question string `json:"question" binding:"required,min=1,max=500"`
	Context  string `json:"context,omitempty"`
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

type QueryResponse struct {
	Success            bool          `json:"success"`
	Query              string        `json:"query"`
	IdentifiedConcepts []string      `json:"identified_concepts"`
	LearningPath       LearningPath  `json:"learning_path"`
	Explanation        string        `json:"explanation"`
	RetrievedContext   []string      `json:"retrieved_context"`
	ProcessingTime     time.Duration `json:"processing_time"`
	ErrorMessage       *string       `json:"error_message,omitempty"`
}

type ConceptDetailRequest struct {
	ConceptID string `json:"concept_id" binding:"required"`
}

type ConceptDetailResponse struct {
	Success             bool                          `json:"success"`
	Concept             *ConceptInfo                  `json:"concept,omitempty"`
	Prerequisites       []ConceptInfo                 `json:"prerequisites"`
	LeadsTo             []ConceptInfo                 `json:"leads_to"`
	LearningResources   []scraper.EducationalResource `json:"learning_resources"`
	DetailedExplanation string                        `json:"detailed_explanation"`
	ErrorMessage        *string                       `json:"error_message,omitempty"`
}

type HealthResponse struct {
	Status               string `json:"status"`
	Service              string `json:"service"`
	KnowledgeGraphLoaded bool   `json:"kg_loaded"`
	VectorStoreLoaded    bool   `json:"vector_store_loaded"`
	TotalConcepts        int    `json:"total_concepts"`
	TotalChunks          int    `json:"total_chunks"`
	Uptime               string `json:"uptime"`
}
