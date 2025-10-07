import type {
  StagedConceptsResponse,
  StatsResponse,
  ReviewResponse,
  ReviewRequest,
} from "../types/admin";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const adminService = {
  async getPendingConcepts(): Promise<StagedConceptsResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/staged-concepts/pending`
      );
      if (!response.ok) {
        console.error("Failed to fetch pending concepts:", response.status);
        return { data: [], total: 0, success: false } as StagedConceptsResponse;
      }
      const result = await response.json();
      // API returns { data: [...], success: true, total: number }
      return {
        data: result.data || [],
        total: result.total || 0,
        success: result.success || false,
      } as StagedConceptsResponse;
    } catch (error) {
      console.error("Error fetching pending concepts:", error);
      return { data: [], total: 0, success: false } as StagedConceptsResponse;
    }
  },

  async getStats(): Promise<StatsResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/staged-concepts/stats`
      );
      if (!response.ok) {
        console.error("Failed to fetch stats:", response.status);
        return { 
          stats: {
            total_count: 0,
            pending_count: 0,
            approved_count: 0,
            rejected_count: 0,
            merged_count: 0,
          },
          success: false 
        } as StatsResponse;
      }
      return response.json();
    } catch (error) {
      console.error("Error fetching stats:", error);
      return { 
        stats: {
          total_count: 0,
          pending_count: 0,
          approved_count: 0,
          rejected_count: 0,
          merged_count: 0,
        },
        success: false 
      } as StatsResponse;
    }
  },

  async reviewConcept(
    id: string,
    reviewData: ReviewRequest
  ): Promise<ReviewResponse> {
    try {
      // Map the frontend action to backend expected format
      const requestBody = {
        reviewer_id: "admin", // TODO: Get from auth context when implemented
        action: reviewData.action, // 'approve', 'reject', or 'merge'
        notes: reviewData.reviewer_notes || "",
        merge_into_id: reviewData.merged_into_concept_id || null,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/staged-concepts/${id}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Review failed:", response.status, errorData);
        throw new Error(
          errorData.error || errorData.message || `Failed to review concept: ${response.status}`
        );
      }
      
      return response.json();
    } catch (error) {
      console.error("Error reviewing concept:", error);
      throw error;
    }
  },
};
