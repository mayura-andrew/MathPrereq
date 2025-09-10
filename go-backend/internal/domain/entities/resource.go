package entities

import (
	"time"

	"github.com/google/uuid"
)

type LearningResource struct {
	ID          string    `json:"id" bson:"_id"`
	ConceptID   string    `json:"concept_id" bson:"concept_id"`
	Title       string    `json:"title" bson:"title"`
	URL         string    `json:"url" bson:"url"`
	Type        string    `json:"type" bson:"type"`
	Difficulty  string    `json:"difficulty" bson:"difficulty"`
	Quality     float64   `json:"quality" bson:"quality"`
	Source      string    `json:"source" bson:"source"`
	Description string    `json:"description" bson:"description"`
	CreatedAt   time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" bson:"updated_at"`
	Tags        []string  `json:"tags" bson:"tags"`
	Duration    int       `json:"duration,omitempty" bson:"duration,omitempty"` // in minutes
}

func NewLearningResource(conceptID, title, url, resourceType string) *LearningResource {
	return &LearningResource{
		ID:        uuid.New().String(),
		ConceptID: conceptID,
		Title:     title,
		URL:       url,
		Type:      resourceType,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Tags:      []string{},
	}
}
