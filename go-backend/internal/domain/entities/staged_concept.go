package entities

import (
	"time"

	"github.com/google/uuid"
)

// StagedConcept represents a new concept identified by the LLM that needs validation
type StagedConcept struct {
	ID              string    `json:"id" bson:"_id"`
	ConceptName     string    `json:"concept_name" bson:"concept_name"`
	Description     string    `json:"description" bson:"description"`
	SourceQueryID   string    `json:"source_query_id" bson:"source_query_id"`
	SourceQueryText string    `json:"source_query_text" bson:"source_query_text"`
	IdentifiedAt    time.Time `json:"identified_at" bson:"identified_at"`

	// LLM suggestions
	SuggestedPrerequisites []string `json:"suggested_prerequisites" bson:"suggested_prerequisites"`
	SuggestedDifficulty    int      `json:"suggested_difficulty" bson:"suggested_difficulty"`
	SuggestedCategory      string   `json:"suggested_category" bson:"suggested_category"`
	LLMReasoning           string   `json:"llm_reasoning" bson:"llm_reasoning"`

	// Validation status
	Status      StagedConceptStatus `json:"status" bson:"status"`
	ReviewedBy  string              `json:"reviewed_by,omitempty" bson:"reviewed_by,omitempty"`
	ReviewedAt  *time.Time          `json:"reviewed_at,omitempty" bson:"reviewed_at,omitempty"`
	ReviewNotes string              `json:"review_notes,omitempty" bson:"review_notes,omitempty"`

	// Metadata
	SubmittedBy     string   `json:"submitted_by" bson:"submitted_by"`
	OccurrenceCount int      `json:"occurrence_count" bson:"occurrence_count"` // How many times this concept appeared
	RelatedQueryIDs []string `json:"related_query_ids" bson:"related_query_ids"`

	// If approved, this links to the actual concept created
	ApprovedConceptID string `json:"approved_concept_id,omitempty" bson:"approved_concept_id,omitempty"`
}

type StagedConceptStatus string

const (
	StagedConceptStatusPending  StagedConceptStatus = "pending"
	StagedConceptStatusApproved StagedConceptStatus = "approved"
	StagedConceptStatusRejected StagedConceptStatus = "rejected"
	StagedConceptStatusMerged   StagedConceptStatus = "merged" // Merged with existing concept
)

// NewStagedConcept creates a new staged concept
func NewStagedConcept(
	conceptName string,
	description string,
	sourceQueryID string,
	sourceQueryText string,
	submittedBy string,
	suggestedPrereqs []string,
	suggestedDifficulty int,
	suggestedCategory string,
	llmReasoning string,
) *StagedConcept {
	return &StagedConcept{
		ID:                     uuid.New().String(),
		ConceptName:            conceptName,
		Description:            description,
		SourceQueryID:          sourceQueryID,
		SourceQueryText:        sourceQueryText,
		IdentifiedAt:           time.Now(),
		SuggestedPrerequisites: suggestedPrereqs,
		SuggestedDifficulty:    suggestedDifficulty,
		SuggestedCategory:      suggestedCategory,
		LLMReasoning:           llmReasoning,
		Status:                 StagedConceptStatusPending,
		SubmittedBy:            submittedBy,
		OccurrenceCount:        1,
		RelatedQueryIDs:        []string{sourceQueryID},
	}
}

// Approve marks the concept as approved
func (sc *StagedConcept) Approve(reviewerID string, notes string, approvedConceptID string) {
	now := time.Now()
	sc.Status = StagedConceptStatusApproved
	sc.ReviewedBy = reviewerID
	sc.ReviewedAt = &now
	sc.ReviewNotes = notes
	sc.ApprovedConceptID = approvedConceptID
}

// Reject marks the concept as rejected
func (sc *StagedConcept) Reject(reviewerID string, notes string) {
	now := time.Now()
	sc.Status = StagedConceptStatusRejected
	sc.ReviewedBy = reviewerID
	sc.ReviewedAt = &now
	sc.ReviewNotes = notes
}

// Merge marks the concept as merged with an existing one
func (sc *StagedConcept) Merge(reviewerID string, notes string, existingConceptID string) {
	now := time.Now()
	sc.Status = StagedConceptStatusMerged
	sc.ReviewedBy = reviewerID
	sc.ReviewedAt = &now
	sc.ReviewNotes = notes
	sc.ApprovedConceptID = existingConceptID
}

// IncrementOccurrence increments the occurrence count
func (sc *StagedConcept) IncrementOccurrence(queryID string) {
	sc.OccurrenceCount++
	sc.RelatedQueryIDs = append(sc.RelatedQueryIDs, queryID)
}
