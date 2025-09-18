import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { styled } from '@mui/material/styles';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { QueryResponse, SmartConceptQueryResponse } from '../types/api';

const ExplanationContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  marginBottom: theme.spacing(3),
}));

const Section = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:last-child': {
    borderBottom: 'none',
  },
}));

const GradientSection = styled(Section)<{ gradient: string }>(({ theme, gradient }) => ({
  background: gradient,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  margin: theme.spacing(1),
}));

export default function TextualExplanation({ response }: { response: string | QueryResponse | SmartConceptQueryResponse }) {
  if (!response) return null;

  // Handle string response (old format)
  if (typeof response === 'string') {
    return (
      <ExplanationContainer>
        <Section>
          <Typography variant="body1">{response}</Typography>
        </Section>
      </ExplanationContainer>
    );
  }

  // Handle QueryResponse or SmartConceptQueryResponse
  const isSmart = 'concept_name' in response;
  const explanation = isSmart ? (response as SmartConceptQueryResponse).explanation : (response as QueryResponse).explanation;
  const learningPath = isSmart ? (response as SmartConceptQueryResponse).learning_path : (response as QueryResponse).learning_path;
  const identifiedConcepts = isSmart ? (response as SmartConceptQueryResponse).identified_concepts : (response as QueryResponse).identified_concepts;

  return (
    <ExplanationContainer>
      <Section sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <MenuBookIcon color="primary" />
          <Typography variant="h6">Detailed Explanation & Solution</Typography>
        </Box>
      </Section>

      {response.success ? (
        <Box>
          {/* Query Summary */}
          <GradientSection gradient="linear-gradient(90deg, #eff6ff 0%, #e0e7ff 100%)">
            <Typography variant="subtitle1" color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon />
              Your Question:
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {isSmart ? (response as SmartConceptQueryResponse).concept_name : (response as QueryResponse).query}
            </Typography>
          </GradientSection>

          {/* Identified Concepts */}
          {identifiedConcepts && identifiedConcepts.length > 0 && (
            <GradientSection gradient="linear-gradient(90deg, #f0fdf4 0%, #dcfce7 100%)">
              <Typography variant="subtitle1" color="success.main" sx={{ mb: 2 }}>
                Mathematical Concepts Identified:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {identifiedConcepts.map((concept: string, index: number) => (
                  <Chip
                    key={index}
                    label={concept}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </GradientSection>
          )}

          {/* Main Solution/Explanation */}
          <Section>
            <Typography variant="h6" sx={{ mb: 2 }}>Step-by-Step Solution:</Typography>
            <Typography variant="body1">{explanation}</Typography>
          </Section>

          {/* Learning Path Concepts */}
          {learningPath && learningPath.concepts && learningPath.concepts.length > 0 && (
            <GradientSection gradient="linear-gradient(90deg, #faf5ff 0%, #f3e8ff 100%)">
              <Typography variant="subtitle1" color="secondary" sx={{ mb: 2 }}>
                Learning Path Concepts:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {learningPath.concepts.slice(0, 8).map((concept, index) => (
                  <Chip
                    key={index}
                    label={concept.name}
                    color="secondary"
                    variant="outlined"
                    size="small"
                  />
                ))}
                {learningPath.concepts.length > 8 && (
                  <Typography variant="caption" color="text.secondary">
                    +{learningPath.concepts.length - 8} more...
                  </Typography>
                )}
              </Box>
            </GradientSection>
          )}

          {/* Processing Info */}
          <Section sx={{ borderTop: 1, borderColor: 'divider' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" gap={2}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <AccessTimeIcon fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Processed in {response.processing_time || '0.00'}s
                  </Typography>
                </Box>
                {identifiedConcepts?.length > 0 && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <SchoolIcon fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      {identifiedConcepts.length} concepts identified
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="body2" color="success.main" fontWeight="medium">
                  Successfully Generated
                </Typography>
              </Box>
            </Box>
          </Section>
        </Box>
      ) : (
        <Section>
          <Box sx={{ bgcolor: 'error.light', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle1" color="error.main" sx={{ mb: 1 }}>
              Error Processing Query
            </Typography>
            <Typography variant="body2">{response.error || 'Unknown error'}</Typography>
          </Box>
        </Section>
      )}
    </ExplanationContainer>
  );
}
