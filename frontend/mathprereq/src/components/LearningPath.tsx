import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

function getTitle(item: unknown, index: number): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const it = item as Record<string, unknown>;
    return (it.name as string) || (it.title as string) || (it.concept as string) || `Step ${index + 1}`;
  }
  return `Step ${index + 1}`;
}

export default function LearningPath({ learningPath }: { learningPath: unknown[] }){
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  if (!Array.isArray(learningPath) || learningPath.length === 0) {
    return (
      <Box sx={{ p:2 }}>
        <Typography>No learning path available.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p:2 }}>
      {learningPath.map((item, i) => {
        const title = getTitle(item, i);
        const desc = item && typeof item === 'object' ? (item as Record<string, unknown>).description as string || '' : '';
        return (
          <Box key={i} sx={{ mb:2, p:1, border:1, borderColor:'divider' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1">{title}</Typography>
                {desc && <Typography variant="caption" color="text.secondary">{desc}</Typography>}
              </Box>
              <Box display="flex" gap={1}>
                <Button size="small" onClick={() => { /* open */ }}>Open</Button>
                <Button size="small" variant={completed.has(i)?'contained':'outlined'} onClick={() => {
                  setCompleted(prev => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i); else next.add(i);
                    return next;
                  })
                }}>{completed.has(i)?'Completed':'Mark'}</Button>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
