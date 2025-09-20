import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import BookIcon from '@mui/icons-material/Book';
import IconButton from '@mui/material/IconButton';

type Resource = { id: number; title: string; type: string; source?: string; duration?: string; url?: string; difficulty?: string };

export default function ResourceRow({ resource }: { resource: Resource }){
  return (
    <Paper variant="outlined" sx={{ p:1, display:'flex', gap:1, alignItems:'center' }}>
      <Avatar variant="rounded">{resource.type === 'video' ? <PlayCircleFilledIcon /> : <BookIcon />}</Avatar>
      <Box sx={{ flex:1 }}>
        <Typography variant="subtitle2" noWrap>{resource.title}</Typography>
        <Typography variant="caption" color="text.secondary">{resource.source}</Typography>
      </Box>
      <Box sx={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
        {resource.duration && <Typography variant="caption">{resource.duration}</Typography>}
        {resource.difficulty && <Chip label={resource.difficulty} size="small" />}
        {resource.url && <IconButton size="small" href={resource.url} target="_blank" rel="noopener"><OpenInNewIcon fontSize="small" /></IconButton>}
      </Box>
    </Paper>
  );
}
