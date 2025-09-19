export type Concept = {
  id: string;
  name: string;
  description?: string;
  type?: string;
  difficulty_level?: string;
};

export type LearningPath = {
  concepts: Concept[];
  total_concepts?: number;
  estimated_duration?: string;
  difficulty_progression?: string;
};

export type ConceptQueryResponse = {
  success: true;
  concept_name?: string;
  source?: 'cache' | 'processed';
  identified_concepts?: string[];
  learning_path?: LearningPath;
  explanation?: string;
  educational_resources?: string[];
  processing_time?: string;
  request_id?: string;
  timestamp?: string;
};
