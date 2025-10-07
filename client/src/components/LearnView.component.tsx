import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { RiSchoolLine } from "react-icons/ri";
import type { LearningPath as LearningPathType } from "../types/api";
import { useResources } from "../hooks/useResources";
import { ConceptAccordion, ResourceSearch } from "./learn";

interface LearnViewProps {
  learningPathData: LearningPathType | null;
}

export default function LearnView({ learningPathData }: LearnViewProps) {
  const [completedConcepts, setCompletedConcepts] = useState<Set<string>>(
    new Set()
  );
  const {
    searchedResources,
    loadingResources,
    conceptResources,
    loadingConceptResources,
    searchResources,
    fetchConceptResources,
  } = useResources();

  const toggleConceptCompletion = (conceptId: string) => {
    const newCompleted = new Set(completedConcepts);
    if (newCompleted.has(conceptId)) {
      newCompleted.delete(conceptId);
    } else {
      newCompleted.add(conceptId);
    }
    setCompletedConcepts(newCompleted);
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box
        sx={{ p: 2, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
      >
        <Typography
          variant="h6"
          sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
        >
          <RiSchoolLine />
          Interactive Learning
        </Typography>
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2, minHeight: 0 }}>
        {!learningPathData?.concepts ||
        learningPathData.concepts.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <RiSchoolLine
              size={48}
              color="text.secondary"
              style={{ marginBottom: 16 }}
            />
            <Typography variant="h6" color="text.secondary">
              No Learning Path Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask a mathematical question in the chat to generate a personalized
              learning path.
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Resource Search */}
            <ResourceSearch
              searchedResources={searchedResources}
              loadingResources={loadingResources}
              onSearch={searchResources}
            />

            {/* Learning Path Concepts */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Your Learning Path ({learningPathData.total_concepts} concepts)
            </Typography>

            {/* Progress indicator */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: "background.paper",
                borderRadius: 2,
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <Typography variant="body2" sx={{ mb: 1 }}>
                Learning Progress
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    flex: 1,
                    height: 10,
                    bgcolor: "grey.200",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${
                        (completedConcepts.size /
                          learningPathData.total_concepts) *
                        100
                      }%`,
                      background: "linear-gradient(90deg, #10b981, #22c55e)",
                      borderRadius: 999,
                      transition: "width 0.4s ease",
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {completedConcepts.size}/{learningPathData.total_concepts}
                </Typography>
              </Box>
            </Box>

            {/* Concept Accordions */}
            {learningPathData.concepts.map((concept) => (
              <ConceptAccordion
                key={concept.id}
                concept={concept}
                resources={conceptResources[concept.id] || []}
                loadingResources={loadingConceptResources[concept.id] || false}
                completed={completedConcepts.has(concept.id)}
                onToggleComplete={toggleConceptCompletion}
                onFetchResources={fetchConceptResources}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
