export interface StagedConcept {
  id: string;
  concept_name: string;
  description: string;
  source_query_id: string;
  source_query_text: string;
  identified_at: string;
  suggested_prerequisites: string[];
  suggested_difficulty: number;
  suggested_category: string;
  llm_reasoning: string;
  status: "pending" | "approved" | "rejected" | "merged";
  submitted_by: string;
  occurrence_count: number;
  related_query_ids: string[];
}

export interface StagedConceptsResponse {
  data: StagedConcept[];
  success: boolean;
  total: number;
}

export interface StatsResponse {
  stats: {
    total_count: number;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    merged_count: number;
    most_recent_pending?: StagedConcept;
  };
  success: boolean;
}

export interface ReviewRequest {
  action: "approve" | "reject" | "merge";
  reviewer_notes?: string;
  merged_into_concept_id?: string;
}

export interface ReviewResponse {
  success: boolean;
  message: string;
  concept?: StagedConcept;
}

export interface Neo4jConcept {
  id: string;
  name: string;
  description: string;
  created: boolean;
}

export interface ReviewResponse {
  success: boolean;
  message: string;
  staged_concept: StagedConcept;
  neo4j_concept?: Neo4jConcept;
  request_id: string;
  timestamp: string;
}
