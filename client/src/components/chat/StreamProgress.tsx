/**
 * StreamProgress Component
 * 
 * Displays real-time streaming progress with visual feedback
 */

import { Box, LinearProgress, Typography, Chip, Stack } from '@mui/material';
import type { StreamState } from '../../types/streaming';

interface StreamProgressProps {
  streamState: StreamState;
}

export default function StreamProgress({ streamState }: StreamProgressProps) {
  if (!streamState.isStreaming && !streamState.completed) {
    return null;
  }

  const { progress, stage, currentStep, totalSteps, concepts, prerequisites, resources } = streamState;

  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
      }}
    >
      {/* Progress Bar */}
      <Box sx={{ mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary">
            {stage || 'Processing...'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {currentStep}/{totalSteps} • {progress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 1,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 1,
              background: streamState.completed
                ? 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)'
                : 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
            },
          }}
        />
      </Box>

      {/* Live Updates */}
      <Stack spacing={1}>
        {concepts.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Concepts Identified ({concepts.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {concepts.map((concept, idx) => (
                <Chip
                  key={idx}
                  label={concept}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {prerequisites.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Prerequisites Retrieved: {prerequisites.length}
            </Typography>
          </Box>
        )}

        {resources.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Learning Resources Found: {resources.length}
            </Typography>
          </Box>
        )}
      </Stack>

      {streamState.error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          Error: {streamState.error}
        </Typography>
      )}

      {streamState.completed && streamState.processingTime && (
        <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
          ✓ Completed in {(streamState.processingTime / 1000000000).toFixed(2)}s
        </Typography>
      )}
    </Box>
  );
}
