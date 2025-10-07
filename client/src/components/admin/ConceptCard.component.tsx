import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Stack,
} from "@mui/material";
import {
  Category as CategoryIcon,
  Functions as DifficultyIcon,
  Timeline as OccurrenceIcon,
} from "@mui/icons-material";
import type { StagedConcept } from "../../types/admin";

interface ConceptCardProps {
  concept: StagedConcept;
  onReview: (concept: StagedConcept) => void;
}

export default function ConceptCard({ concept, onReview }: ConceptCardProps) {
  const displaySource = concept.source_query_id
    ? `...${concept.source_query_id.substring(concept.source_query_id.length - 8)}`
    : "Unknown";

  const displayCategory = concept.suggested_category
    ? concept.suggested_category.charAt(0).toUpperCase() +
      concept.suggested_category.slice(1).replace("_", " ")
    : "Uncategorized";

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return "success";
    if (difficulty <= 6) return "warning";
    return "error";
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 1.5,
            alignItems: "flex-start",
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 600,
              fontSize: "1.1rem",
              flex: 1,
              mr: 1,
            }}
          >
            {concept.concept_name}
          </Typography>
          <Chip
            label={displayCategory}
            size="small"
            color="primary"
            variant="outlined"
            icon={<CategoryIcon />}
          />
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.5,
          }}
        >
          {concept.description}
        </Typography>

        <Stack spacing={1}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={`Difficulty: ${concept.suggested_difficulty || "N/A"}`}
              size="small"
              color={getDifficultyColor(concept.suggested_difficulty || 5)}
              variant="outlined"
              icon={<DifficultyIcon />}
            />
            <Chip
              label={`${concept.occurrence_count || 0} occurrence${
                (concept.occurrence_count || 0) !== 1 ? "s" : ""
              }`}
              size="small"
              variant="outlined"
              icon={<OccurrenceIcon />}
            />
          </Box>

          {concept.suggested_prerequisites &&
            concept.suggested_prerequisites.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                <strong>Prerequisites:</strong>{" "}
                {concept.suggested_prerequisites.join(", ")}
              </Typography>
            )}

          <Typography variant="caption" color="text.secondary">
            Source: {displaySource}
          </Typography>
        </Stack>
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        <Button
          size="small"
          variant="contained"
          fullWidth
          onClick={() => onReview(concept)}
        >
          Review
        </Button>
      </CardActions>
    </Card>
  );
}
