import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';

export type Message = { id: number; text: string; role?: 'user'|'bot' };

export default function Chat({ messages, input, setInput, onSubmit, isLoading }:
  { messages: Message[]; input: string; setInput: (v:string)=>void; onSubmit: (e?:React.FormEvent)=>void; isLoading: boolean }){
  return (
    <Box sx={{ p:2, height:'100%', display:'flex', flexDirection:'column' }}>
      <Typography variant="h6">Chat</Typography>
      <List sx={{ flex:1, overflow:'auto' }}>
        {messages.map(m=> (
          <ListItem key={m.id}>{m.role==='user'? 'You:': 'Bot:'} {m.text}</ListItem>
        ))}
      </List>
      <Box component="form" onSubmit={onSubmit} sx={{ display:'flex', gap:1 }}>
        <TextField fullWidth size="small" value={input} onChange={(e)=>setInput(e.target.value)} />
        <Button type="submit" variant="contained" disabled={isLoading}>Send</Button>
      </Box>
    </Box>
  );
}
