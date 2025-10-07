import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  MergeType as MergeIcon,
} from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/admin.service";
import type { StagedConcept } from "../../types/admin";

interface ReviewModalProps {
  concept: StagedConcept | null;
  open: boolean;
  onClose: () => void;
}

export default function ReviewModal({ concept, open, onClose }: ReviewModalProps) {
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [mergeConceptId, setMergeConceptId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: (action: "approve" | "reject" | "merge") =>
      adminService.reviewConcept(concept!.id, {
        action,
        reviewer_notes: reviewerNotes || undefined,
        merged_into_concept_id: action === "merge" ? mergeConceptId : undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pendingConcepts"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setSuccess(data.message || "Concept reviewed successfully!");
      setTimeout(() => {
        handleClose();
      }, 1500);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to review concept");
    },
  });

  const handleClose = () => {
    setReviewerNotes("");
    setMergeConceptId("");
    setError(null);
    setSuccess(null);
    onClose();
  };

  const handleReview = (action: "approve" | "reject" | "merge") => {
    setError(null);
    reviewMutation.mutate(action);
  };

  if (!concept) return null;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Review: {concept.concept_name}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success">{success}</Alert>
            )}

            {/* Concept Details */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1">{concept.description}</Typography>
            </Box>

            {/* Metadata */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                label={`Category: ${concept.suggested_category || "N/A"}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Difficulty: ${concept.suggested_difficulty || "N/A"}/10`}
                size="small"
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={`${concept.occurrence_count || 0} occurrence${(concept.occurrence_count || 0) !== 1 ? 's' : ''}`}
                size="small"
                variant="outlined"
              />
            </Box>

            {/* Prerequisites */}
            {concept.suggested_prerequisites && concept.suggested_prerequisites.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Suggested Prerequisites
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {concept.suggested_prerequisites.map((prereq, idx) => (
                    <Chip key={idx} label={prereq} size="small" />
                  ))}
                </Box>
              </Box>
            )}

            {/* LLM Reasoning */}
            {concept.llm_reasoning && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  AI Analysis
                </Typography>
                <Alert severity="info" sx={{ mt: 1 }}>
                  {concept.llm_reasoning}
                </Alert>
              </Box>
            )}

            {/* Source Query */}
            {concept.source_query_text && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Source Query
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "grey.50",
                    borderRadius: 1,
                    maxHeight: 200,
                    overflow: "auto",
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {concept.source_query_text}
                  </Typography>
                </Box>
              </Box>
            )}

            <Divider />

            {/* Review Notes */}
            <TextField
              label="Review Notes"
              multiline
              rows={3}
              fullWidth
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              placeholder="Add any notes about your review decision..."
            />

            {/* Merge Option */}
            <TextField
              label="Merge into Concept ID (optional)"
              fullWidth
              value={mergeConceptId}
              onChange={(e) => setMergeConceptId(e.target.value)}
              placeholder="Enter concept ID to merge this into..."
              helperText="Only use if merging with an existing concept"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={handleClose} variant="outlined" disabled={reviewMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => handleReview("reject")}
            color="error"
            variant="outlined"
            startIcon={<RejectIcon />}
            disabled={reviewMutation.isPending}
          >
            Reject
          </Button>
          {mergeConceptId && (
            <Button
              onClick={() => handleReview("merge")}
              color="info"
              variant="outlined"
              startIcon={<MergeIcon />}
              disabled={reviewMutation.isPending}
            >
              Merge
            </Button>
          )}
          <Button
            onClick={() => handleReview("approve")}
            color="success"
            variant="contained"
            startIcon={<ApproveIcon />}
            disabled={reviewMutation.isPending}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
