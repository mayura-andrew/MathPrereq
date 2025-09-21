import type { Concept, LearningPath } from '../types/api';
import VisualRoadmap from './VisualRoadmap.component';

export default function ConceptMap({ concepts }: { concepts: Concept[] }) {
  // Convert concepts to LearningPath format
  const learningPath: LearningPath = {
    concepts: concepts.map(c => ({
      ...c, // Keep all original properties
    })),
    total_concepts: concepts.length,
  };

  return <VisualRoadmap learningPath={learningPath} />;
}
