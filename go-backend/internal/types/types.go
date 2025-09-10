package types

import "time"

// Core domain concept
type Concept struct {
	ID          string    `json:"id" bson:"id"`
	Name        string    `json:"name" bson:"name"`
	Description string    `json:"description" bson:"description"`
	Type        string    `json:"type" bson:"type"`
	CreatedAt   time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" bson:"updated_at"`
}

// Results from graph queries
type ConceptDetailResult struct {
	Concept             Concept   `json:"concept"`
	Prerequisites       []Concept `json:"prerequisites"`
	LeadsTo             []Concept `json:"leads_to"`
	DetailedExplanation string    `json:"detailed_explanation"`
}

type PrerequisitePathResult struct {
	Concepts []Concept `json:"concepts"`
}

type SystemStats struct {
	TotalConcepts  int64  `json:"total_concepts"`
	TotalChunks    int64  `json:"total_chunks"`
	TotalEdges     int64  `json:"total_edges"`
	KnowledgeGraph string `json:"knowledge_graph"`
	VectorStore    string `json:"vector_store"`
	LLMProvider    string `json:"llm_provider"`
	SystemHealth   string `json:"system_health"`
}

// Vector search result
type VectorResult struct {
	Content  string                 `json:"content"`
	Score    float64                `json:"score"`
	Metadata map[string]interface{} `json:"metadata"`
}
