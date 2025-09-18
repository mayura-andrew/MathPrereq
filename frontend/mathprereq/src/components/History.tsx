import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import type { Message } from '../types/api';

export default function History({ messages, onSelect }: { messages: Message[]; onSelect: (text: string) => void }){
  const userMessages = messages.filter(m => m.role === 'user' && typeof m.text === 'string');
  return (
    <Box sx={{ width: 280, p:2, borderRight:1, borderColor:'divider', height:'100%', boxSizing:'border-box' }}>
      <Typography variant="h6">History</Typography>
      <Divider sx={{ my:1 }} />
      <List>
        {userMessages.length === 0 ? (
          <Typography color="text.secondary" sx={{ px:1 }}>No saved questions</Typography>
        ) : (
          userMessages.map(m => (
            <ListItemButton key={m.id} onClick={() => onSelect(m.text as string)}>
              <ListItemText primary={m.text as string} />
            </ListItemButton>
          ))
        )}
      </List>
    </Box>
  );
}
