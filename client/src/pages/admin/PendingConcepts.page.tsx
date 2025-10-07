import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import ConceptCard from "../../components/admin/ConceptCard.component";
import ReviewModal from "../../components/admin/ReviewModal.component";
import { adminService } from "../../services/admin.service";
import type { StagedConcept } from "../../types/admin";

export default function PendingConcepts() {
  const [selectedConcept, setSelectedConcept] = useState<StagedConcept | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"confidence" | "date" | "name">("date");

  const { data, isLoading } = useQuery({
    queryKey: ["pendingConcepts"],
    queryFn: adminService.getPendingConcepts,
    refetchInterval: 30000,
  });

  const filteredAndSortedConcepts = useMemo(() => {
    // API returns { data: [...], total: number, success: boolean }
    const concepts = data?.data || [];
    if (concepts.length === 0) return [];

    let filtered = concepts.filter((concept) => {
      const matchesSearch = concept.concept_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesSource =
        sourceFilter === "all" || concept.source_query_id === sourceFilter;
      const matchesConfidence =
        confidenceFilter === "all" ||
        (confidenceFilter === "high" && (concept.occurrence_count || 0) >= 5) ||
        (confidenceFilter === "medium" &&
          (concept.occurrence_count || 0) >= 2 &&
          (concept.occurrence_count || 0) < 5) ||
        (confidenceFilter === "low" && (concept.occurrence_count || 0) < 2);

      return matchesSearch && matchesSource && matchesConfidence;
    });

    filtered.sort((a, b) => {
      if (sortBy === "confidence") return (b.occurrence_count || 0) - (a.occurrence_count || 0);
      if (sortBy === "date")
        return (
          new Date(b.identified_at || 0).getTime() - 
          new Date(a.identified_at || 0).getTime()
        );
      if (sortBy === "name")
        return a.concept_name.localeCompare(b.concept_name);
      return 0;
    });

    return filtered;
  }, [data, searchTerm, sourceFilter, confidenceFilter, sortBy]);

  const uniqueSources = useMemo(() => {
    const concepts = data?.data || [];
    if (concepts.length === 0) return [];
    return [...new Set(concepts.map((c) => c.source_query_id).filter(Boolean))];
  }, [data]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const totalCount = data?.total || 0;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Pending Concepts Review
      </Typography>

      {/* Filters */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            label="Search concepts"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 250 } }}
          />

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
            <InputLabel>Source</InputLabel>
            <Select
              value={sourceFilter}
              label="Source"
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <MenuItem value="all">All Sources</MenuItem>
              {uniqueSources.map((source) => (
                <MenuItem key={source} value={source}>
                  {source.substring(0, 8)}...
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
            <InputLabel>Occurrences</InputLabel>
            <Select
              value={confidenceFilter}
              label="Occurrences"
              onChange={(e) => setConfidenceFilter(e.target.value)}
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="high">High (≥5)</MenuItem>
              <MenuItem value="medium">Medium (2-4)</MenuItem>
              <MenuItem value="low">Low (1)</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) =>
                setSortBy(e.target.value as "confidence" | "date" | "name")
              }
            >
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="confidence">Occurrences</MenuItem>
              <MenuItem value="name">Name</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Showing {filteredAndSortedConcepts.length} of {totalCount} concepts
        </Typography>
      </Box>

      {/* Concepts Grid */}
      {filteredAndSortedConcepts.length > 0 ? (
        <Grid container spacing={2}>
          {filteredAndSortedConcepts.map((concept) => (
            <Grid item xs={12} sm={6} lg={4} key={concept.id}>
              <ConceptCard
                concept={concept}
                onReview={(c) => setSelectedConcept(c)}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            bgcolor: "background.paper",
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No pending concepts found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm || sourceFilter !== "all" || confidenceFilter !== "all"
              ? "Try adjusting your filters"
              : "All concepts have been reviewed"}
          </Typography>
        </Box>
      )}

      <ReviewModal
        concept={selectedConcept}
        open={!!selectedConcept}
        onClose={() => setSelectedConcept(null)}
      />
    </Box>
  );
}
