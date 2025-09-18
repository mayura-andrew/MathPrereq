import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import type { LearningPath as LearningPathType } from '../types/api';

export default function LearningPath({ learningPath }: { learningPath: LearningPathType | undefined }){
  if (!learningPath || !learningPath.concepts) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No learning path available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Learning Path</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Total concepts: {learningPath.total_concepts}
        {learningPath.estimated_duration && ` • Estimated duration: ${learningPath.estimated_duration}`}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {learningPath.concepts.map((concept) => (
          <Paper key={concept.id} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <Typography variant="h6">{concept.name}</Typography>
              <Chip
                label={concept.type}
                size="small"
                color={
                  concept.type === 'prerequisite' ? 'warning' :
                  concept.type === 'target' ? 'success' : 'default'
                }
              />
              {concept.difficulty_level && (
                <Chip
                  label={concept.difficulty_level}
                  size="small"
                  variant="outlined"
                  color={
                    concept.difficulty_level === 'beginner' ? 'success' :
                    concept.difficulty_level === 'intermediate' ? 'warning' :
                    concept.difficulty_level === 'advanced' ? 'error' : 'default'
                  }
                />
              )}
            </Box>

            {concept.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {concept.description}
              </Typography>
            )}

            {concept.tags && concept.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {concept.tags.map((tag, tagIndex) => (
                  <Chip key={tagIndex} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            )}
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
