import { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import { RiArrowDownSLine, RiStarLine, RiSchoolLine } from "react-icons/ri";
import type { Concept } from "../../types/api";
import { ResourceCard } from "../ui";

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

interface ConceptAccordionProps {
  concept: Concept;
  resources: APIResource[];
  loadingResources: boolean;
  completed: boolean;
  onToggleComplete: (conceptId: string) => void;
  onFetchResources: (conceptId: string, conceptName: string) => void;
}

export default function ConceptAccordion({
  concept,
  resources,
  loadingResources,
  completed,
  onToggleComplete,
  onFetchResources,
}: ConceptAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  const handleExpand = () => {
    if (!expanded && resources.length === 0) {
      onFetchResources(concept.id, concept.name);
    }
    setExpanded(!expanded);
  };

  return (
    <Accordion expanded={expanded} onChange={handleExpand}>
      <AccordionSummary expandIcon={<RiArrowDownSLine />}>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}
        >
          <RiSchoolLine color="#1976d2" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{concept.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {concept.description}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={concept.difficulty_level || "intermediate"}
              size="small"
              color={completed ? "success" : "default"}
              variant={completed ? "filled" : "outlined"}
            />
            {completed && <RiStarLine color="#ed6c02" />}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ mb: 2 }}>
          <Button
            variant={completed ? "outlined" : "contained"}
            color={completed ? "success" : "primary"}
            onClick={() => onToggleComplete(concept.id)}
            sx={{ mr: 1 }}
          >
            {completed ? "Mark Incomplete" : "Mark Complete"}
          </Button>
        </Box>

        {loadingResources ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress />
          </Box>
        ) : resources.length > 0 ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 2,
            }}
          >
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No resources found for this concept.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
