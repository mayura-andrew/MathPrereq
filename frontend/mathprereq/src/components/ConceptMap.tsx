import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export type Concept = { id:number; title:string; description?:string };

export default function ConceptMap({ concepts, onSelect }:
  { concepts: Concept[]; onSelect?: (c:Concept)=>void }){
  return (
    <Box sx={{ p:2 }}>
      <Typography variant="h6">Concept Map</Typography>
      <Box sx={{ mt:2 }}>
        {concepts.map(c=> (
          <Box key={c.id} sx={{ p:1, border:1, borderColor:'divider', mb:1, cursor:'pointer' }} onClick={()=>onSelect?.(c)}>
            <Typography variant="subtitle1">{c.title}</Typography>
            <Typography variant="body2" color="text.secondary">{c.description}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
