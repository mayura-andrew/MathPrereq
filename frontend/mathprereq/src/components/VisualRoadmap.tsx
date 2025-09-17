import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function VisualRoadmap({ learningPath } : { learningPath: unknown[] }){
  const [nodes, setNodes] = useState<{id:number;name:string;description:string}[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const items = Array.isArray(learningPath) ? learningPath : [];
    const built = items.map((it, i) => {
      const name = typeof it === 'string' ? it : ((it && typeof it === 'object') ? ((it as Record<string, unknown>).name as string) || ((it as Record<string, unknown>).title as string) || `Concept ${i+1}` : `Concept ${i+1}`);
      const description = (it && typeof it === 'object' && (it as Record<string, unknown>).description) ? ((it as Record<string, unknown>).description as string) : '';
      return { id: i, name, description };
    });
    setNodes(built);
  }, [learningPath]);

  if (nodes.length === 0) {
    return (
      <Paper sx={{ p:2 }}>
        <Typography>No Knowledge Map available</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display:'flex', gap:2 }}>
      <Box sx={{ flex:1, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:2 }}>
        {nodes.map(n => (
          <Paper key={n.id} sx={{ p:2, cursor:'pointer' }} onClick={() => setSelected(n.id)}>
            <Typography variant="subtitle1">{n.name}</Typography>
            <Typography variant="caption" color="text.secondary">{n.description}</Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ width:320 }}>
        {selected !== null ? (
          <Paper sx={{ p:2 }}>
            <Typography variant="h6">{nodes[selected].name}</Typography>
            <Typography variant="body2" color="text.secondary">{nodes[selected].description}</Typography>
            <Box mt={2} display="flex" gap={1}>
              <Button size="small" variant="contained">Start Learning</Button>
              <Button size="small" variant="outlined">Mark Complete</Button>
            </Box>
          </Paper>
        ) : (
          <Paper sx={{ p:2 }}>
            <Typography variant="subtitle1">Select a concept to view details</Typography>
            <Typography variant="caption" color="text.secondary">Interactive map simplified for performance</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
