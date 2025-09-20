import { useState } from 'react';
import { mathAPI } from '../services/api';

interface APIResponse {
  success: boolean;
  message: string;
  resources: APIResource[];
  total_found: number;
  request_id: string;
}

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

export function useResources() {
  const [searchedResources, setSearchedResources] = useState<APIResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [conceptResources, setConceptResources] = useState<Record<string, APIResource[]>>({});
  const [loadingConceptResources, setLoadingConceptResources] = useState<Record<string, boolean>>({});

  const searchResources = async (query: string) => {
    if (!query.trim()) return;

    setLoadingResources(true);
    try {
      const response = await mathAPI.getResourcesForConcept(query.trim(), {
        limit: 10,
        minQuality: 70,
      });

      // Handle different response formats
      let apiData: unknown = response;
      if (response && typeof response === 'object' && 'data' in response) {
        apiData = response.data;
      }

      let resources: APIResource[] = [];
      if (Array.isArray(apiData)) {
        resources = apiData as APIResource[];
      } else if (apiData && typeof apiData === 'object' && 'resources' in apiData) {
        resources = (apiData as APIResponse).resources || [];
      }

      setSearchedResources(resources);
    } catch (error) {
      console.error('Failed to search resources:', error);
      setSearchedResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  const fetchConceptResources = async (conceptId: string, conceptName: string) => {
    setLoadingConceptResources(prev => ({ ...prev, [conceptId]: true }));
    try {
      const response = await mathAPI.getResourcesForConcept(conceptName, {
        limit: 5,
        minQuality: 60,
      });

      let apiData: unknown = response;
      if (response && typeof response === 'object' && 'data' in response) {
        apiData = response.data;
      }

      let resources: APIResource[] = [];
      if (Array.isArray(apiData)) {
        resources = apiData as APIResource[];
      } else if (apiData && typeof apiData === 'object' && 'resources' in apiData) {
        resources = (apiData as APIResponse).resources || [];
      }

      setConceptResources(prev => ({ ...prev, [conceptId]: resources }));
    } catch (error) {
      console.error(`Failed to fetch resources for concept ${conceptName}:`, error);
      setConceptResources(prev => ({ ...prev, [conceptId]: [] }));
    } finally {
      setLoadingConceptResources(prev => ({ ...prev, [conceptId]: false }));
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