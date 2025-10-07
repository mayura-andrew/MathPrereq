import { useState } from "react";
import { mathAPI } from "../services/api";
import type { EducationalResource } from "../types/api";

interface APIResource {
  id: string;
  concept_id: string;
  concept_name: string;
  title: string;
  url: string;
  description: string;
  resource_type: string;
  source_domain: string;
  difficulty_level: string;
  quality_score: number;
  content_preview: string;
  scraped_at: string;
  language: string;
  duration: string;
  thumbnail_url: string;
  view_count: number;
  author_channel: string;
  tags: string[] | null;
  is_verified: boolean;
}

// Adapter: map API/EducationalResource to UI's APIResource shape (legacy component contract)
function adaptResources(data: EducationalResource[] | unknown): APIResource[] {
  if (!Array.isArray(data)) return [];
  return (data as EducationalResource[]).map((r) => ({
    id: r.id,
    concept_id: (r.concept_ids && r.concept_ids[0]) || "",
    concept_name: "",
    title: r.title,
    url: r.url,
    description: r.description,
    resource_type: r.resource_type,
    source_domain: (r as any).platform || "other",
    difficulty_level: r.difficulty_level,
    quality_score: r.quality_score,
    content_preview: (r as any).metadata?.content_preview || "",
    scraped_at: r.scraped_at,
    language: r.language,
    duration: r.estimated_duration || "",
    thumbnail_url: r.thumbnail_url || "",
    view_count: r.view_count || 0,
    author_channel: r.author || "",
    tags: r.tags || [],
    is_verified: false,
  }));
}

export function useResources() {
  const [searchedResources, setSearchedResources] = useState<APIResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [conceptResources, setConceptResources] = useState<
    Record<string, APIResource[]>
  >({});
  const [loadingConceptResources, setLoadingConceptResources] = useState<
    Record<string, boolean>
  >({});

  const searchResources = async (query: string) => {
    if (!query.trim()) return;

    setLoadingResources(true);
    try {
      const response = await mathAPI.getResourcesForConcept(query.trim(), {
        limit: 10,
        minQuality: 70,
      });
      const resources = adaptResources(response);
      // Fallback: try smartConceptQuery if empty
      if (resources.length === 0) {
        const alt = await mathAPI.smartConceptQuery(query.trim(), {
          includeResources: true,
          includeLearningPath: false,
          maxResources: 10,
        });
        setSearchedResources(adaptResources(alt.educational_resources || []));
      } else {
        setSearchedResources(resources);
      }
    } catch (error) {
      console.error("Failed to search resources:", error);
      setSearchedResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  const fetchConceptResources = async (
    conceptId: string,
    conceptName: string
  ) => {
    setLoadingConceptResources((prev) => ({ ...prev, [conceptId]: true }));
    try {
      const response = await mathAPI.getResourcesForConcept(conceptName, {
        limit: 5,
        minQuality: 60,
      });
      let resources = adaptResources(response);
      // Fallback to smartConceptQuery if no results
      if (resources.length === 0) {
        const alt = await mathAPI.smartConceptQuery(conceptName, {
          includeResources: true,
          includeLearningPath: false,
          maxResources: 5,
        });
        resources = adaptResources(alt.educational_resources || []);
      }

      setConceptResources((prev) => ({ ...prev, [conceptId]: resources }));
    } catch (error) {
      console.error(
        `Failed to fetch resources for concept ${conceptName}:`,
        error
      );
      setConceptResources((prev) => ({ ...prev, [conceptId]: [] }));
    } finally {
      setLoadingConceptResources((prev) => ({ ...prev, [conceptId]: false }));
    }
  };

  return {
    searchedResources,
    loadingResources,
    conceptResources,
    loadingConceptResources,
    searchResources,
    fetchConceptResources,
  };
}
