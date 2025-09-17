import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import BookIcon from '@mui/icons-material/Book';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { FixedSizeList as VirtualList } from 'react-window';
import ResourceRow from './_ResourceRow';
import type { Concept } from './ConceptMap';

type Resource = { id: number; title: string; type: string; source?: string; duration?: string; url?: string; difficulty?: string };

export default function Resources({ resources, onSearch, selectedConcept }: { resources: Resource[]; onSearch: (v:string)=>void; selectedConcept?: Concept | null }){
  const filtered = selectedConcept ? resources.filter(r => r.title.toLowerCase().includes(selectedConcept.title.toLowerCase())) : resources;
  const Row = ({ index, style }: { index:number; style:React.CSSProperties }) => (
    <div style={style} key={filtered[index].id}>
      <ResourceRow resource={filtered[index]} />
    </div>
  );

  return (
    <Box sx={{ width:360, borderLeft:1, borderColor:'divider', p:2, display:'flex', flexDirection:'column' }}>
      <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
        <BookIcon />
        <Typography variant="h6">Learning Resources</Typography>
      </Box>

      <TextField size="small" placeholder="Search resources" onChange={(e)=>onSearch(e.target.value)} sx={{ mt:1 }} />

      <Divider sx={{ my:1 }} />

      {selectedConcept && (
        <Box sx={{ mb:1, p:1, border:1, borderColor:'divider' }}>
          <Typography variant="subtitle1">{selectedConcept.title}</Typography>
          <Typography variant="body2" color="text.secondary">{selectedConcept.description}</Typography>
        </Box>
      )}

      <Box sx={{ flex:1 }}>
        {filtered.length === 0 ? (
          <Box sx={{ textAlign:'center', mt:4 }}>
            <Typography color="text.secondary">No resources found</Typography>
          </Box>
        ) : (
          <VirtualList height={560} itemCount={filtered.length} itemSize={84} width={'100%'}>
            {Row}
          </VirtualList>
        )}
      </Box>

      <Divider sx={{ my:1 }} />
      <Button variant="contained" fullWidth startIcon={<OpenInNewIcon />}>Explore More</Button>
    </Box>
  );
}
