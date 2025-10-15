import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import ReactMarkdown from 'react-markdown';
import { RiFileCopyLine, RiFullscreenLine, RiCloseLine } from 'react-icons/ri';
import type { QueryResponse, SmartConceptQueryResponse } from "../types/api";

export default function TextualExplanation({
  response,
}: {
  response: QueryResponse | SmartConceptQueryResponse | undefined;
}) {
  // Local UI state for toolbar
  const [copiedOpen, setCopiedOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debug logging
  console.log('🎨 TextualExplanation render:', {
    hasResponse: !!response,
    explanation: response?.explanation,
    explanationLength: response?.explanation?.length,
    isStreaming: (response as any)?.is_streaming,
    explanationType: typeof response?.explanation,
  });

  const handleCopy = async () => {
    if (!response?.explanation) return;
    try {
      await navigator.clipboard.writeText(response.explanation);
      setCopiedOpen(true);
    } catch (err) {
      // Fallback: create a textarea
      const ta = document.createElement('textarea');
      ta.value = response.explanation;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopiedOpen(true); } catch {}
      document.body.removeChild(ta);
    }
  };

  if (!response) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="error.main">
          No response available
        </Typography>
      </Box>
    );
  }

  if (!response.success) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="error.main">
          {response.error || "Request failed"}
        </Typography>
      </Box>
    );
  }

  // Handle different response types
  const isQueryResponse = "query" in response;
  const isSmartConceptResponse = "concept_name" in response;

  return (
    <Box sx={{ width: "100%", maxWidth: "none", overflow: "visible" }}>
      {/* Response Type Indicator */}
      <Box sx={{ mb: 2 }}>
        <Chip
          label={isQueryResponse ? "General Query" : "Smart Concept Analysis"}
          color="primary"
          size="small"
        />
      </Box>

      {/* Main Explanation */}
      {response.explanation !== undefined && response.explanation !== null ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Explanation
          </Typography>
          <Paper
            sx={{
              p: 2.25,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              // Allow long explanations to scroll instead of being visually cut off.
              maxHeight: '60vh',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              "& code": {
                bgcolor: "rgba(148, 163, 184, 0.16)",
                px: 0.5,
                py: 0.25,
                borderRadius: 0.75,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: "0.92em",
              },
              "& pre": {
                bgcolor: "rgba(148, 163, 184, 0.16)",
                p: 1,
                borderRadius: 1,
                overflow: "auto",
                maxHeight: '40vh',
              },
              "& h1, & h2, & h3, & h4, & h5, & h6": {
                color: "primary.main",
                mt: 2,
                mb: 1,
              },
              "& ul, & ol": {
                pl: 2,
              },
              "& li": {
                mb: 0.5,
              },
              "& blockquote": {
                borderLeft: 4,
                borderColor: "primary.main",
                pl: 2,
                fontStyle: "italic",
                color: "text.secondary",
              },
            }}
            >
            {/* Toolbar */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Tooltip title="Copy explanation">
                <IconButton size="small" onClick={handleCopy} aria-label="copy-explanation">
                  <RiFileCopyLine />
                </IconButton>
              </Tooltip>
              <Tooltip title="Open full view">
                <IconButton size="small" onClick={() => setDialogOpen(true)} aria-label="open-full">
                  <RiFullscreenLine />
                </IconButton>
              </Tooltip>
            </Box>

            {response.explanation ? (
              <ReactMarkdown>{response.explanation}</ReactMarkdown>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {(response as any).is_streaming ? 'Generating explanation...' : 'No explanation yet.'}
              </Typography>
            )}
          </Paper>

          {/* Snackbar for copy confirmation */}
          <Snackbar
            open={copiedOpen}
            autoHideDuration={2000}
            onClose={() => setCopiedOpen(false)}
            message="Explanation copied"
          />

          {/* Dialog to show full explanation */}
          <Dialog
            fullWidth
            maxWidth="md"
            fullScreen={(response?.explanation?.length || 0) > 2000}
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
          >
            <DialogTitle>
              Full Explanation
              <IconButton aria-label="close" onClick={() => setDialogOpen(false)} sx={{ float: 'right' }}>
                <RiCloseLine />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ maxHeight: '80vh', overflowY: 'auto', p: 2 }}>
              <Box sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                <ReactMarkdown>{response?.explanation || ''}</ReactMarkdown>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { handleCopy(); setDialogOpen(false); }}>Copy</Button>
              <Button onClick={() => {
                // Open explanation in a new tab as plain text for guaranteed full view
                const text = response?.explanation || '';
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                // Revoke after a delay
                setTimeout(() => URL.revokeObjectURL(url), 10000);
              }}>
                Open in new tab
              </Button>
              <Button onClick={() => setDialogOpen(false)} variant="contained">Close</Button>
            </DialogActions>
          </Dialog>
        </Box>
      ) : null}

      {/* Identified Concepts */}
      {response.identified_concepts &&
        response.identified_concepts.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Key Concepts Identified
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {response.identified_concepts.map((concept, index) => (
                <Chip
                  key={index}
                  label={concept}
                  variant="outlined"
                  color="secondary"
                />
              ))}
            </Box>
          </Box>
        )}

      {/* Smart Concept Specific Fields */}
      {isSmartConceptResponse && (
        <>
          {/* Concept Name */}
          {(response as SmartConceptQueryResponse).concept_name && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">
                Concept: {(response as SmartConceptQueryResponse).concept_name}
              </Typography>
            </Box>
          )}

          {/* Educational Resources */}
          {(response as SmartConceptQueryResponse).educational_resources &&
            (response as SmartConceptQueryResponse).educational_resources!
              .length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Educational Resources (
                  {
                    (response as SmartConceptQueryResponse)
                      .educational_resources!.length
                  }
                  )
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {(response as SmartConceptQueryResponse)
                    .educational_resources!.slice(0, 5)
                    .map((resource) => (
                      <Paper key={resource.id} sx={{ p: 2 }}>
                        <Typography variant="subtitle2">
                          {resource.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          {resource.description}
                        </Typography>
                        <Box
                          sx={{ display: "flex", gap: 1, alignItems: "center" }}
                        >
                          <Chip label={resource.platform} size="small" />
                          <Chip
                            label={resource.resource_type}
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="caption">
                            Quality: {resource.quality_score}/100
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                </Box>
              </Box>
            )}

          {/* Cache Information */}
          {(response as SmartConceptQueryResponse).cache_age && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                ⚡ Served from cache (
                {(response as SmartConceptQueryResponse).cache_age})
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Processing Information */}
      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary">
          Processing time: {response.processing_time} • Request ID:{" "}
          {response.request_id} • Timestamp:{" "}
          {new Date(response.timestamp).toLocaleString()}
        </Typography>
      </Box>
    </Box>
  );
}
        