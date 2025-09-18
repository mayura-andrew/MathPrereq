import React, { useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TextualExplanation from './TextualExplanation';
import type { Message } from '../types/api';

export default function Chat({ messages, input, setInput, onSubmit, isLoading, onNewQuestion }:
  { messages: Message[]; input: string; setInput: (v:string)=>void; onSubmit: (e?:React.FormEvent)=>void; isLoading: boolean; onNewQuestion: () => void }){
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const exampleQuestions = [
    'How do I solve quadratic equations?',
    'What is the chain rule in calculus?',
    'Explain matrix multiplication',
    'How do I find derivatives of trig functions?'
  ];

  // find last user question and last bot response
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const lastBot = [...messages].reverse().find(m => m.role === 'bot');
  const hasAnswer = !!lastBot;

  return (
    <Box sx={{ p:2, height: '100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent: hasAnswer ? 'flex-start' : 'center', gap:2 }}>
      <Box sx={{ width: '100%', maxWidth: 900, display:'flex', flexDirection:'column', gap:2 }}>
        {/* Input section - centered when no answer, top when answer present */}
        <Paper sx={{ p:3, boxShadow: 3, borderRadius: 3 }}>
          <Box component="form" onSubmit={(e)=>{ e.preventDefault(); onSubmit(); }} sx={{ display:'flex', gap:1, alignItems:'flex-end' }}>
            <TextField
              inputRef={textareaRef}
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste or type a math question..."
              multiline
              minRows={3}
              maxRows={10}
              fullWidth
              size="medium"
              sx={{ '& .MuiOutlinedInput-root': { fontSize: '1.1rem' } }}
            />
            <IconButton color="primary" type="submit" disabled={!input.trim() || isLoading} sx={{ bgcolor: 'primary.main', color: 'common.white', p: 2 }}>
              {isLoading ? <CircularProgress size={24} color="inherit" /> : <SendIcon fontSize="large" />}
            </IconButton>
          </Box>

          {isLoading && (
            <Box display="flex" alignItems="center" gap={1} mt={2}>
              <CircularProgress size={20} />
              <Typography variant="body2">Thinking...</Typography>
            </Box>
          )}
        </Paper>

        {/* Examples - only show if no answer yet */}
        {!hasAnswer && !isLoading && (
          <Box sx={{ textAlign: 'center' }}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={2}>
              <AutoAwesomeIcon color="action" />
              <Typography variant="subtitle1">Try these examples</Typography>
            </Box>
            <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', justifyContent: 'center' }}>
              {exampleQuestions.map((ex, i) => (
                <Button key={i} size="medium" variant="outlined" onClick={() => setInput(ex)} sx={{ borderRadius: 2 }}>{ex}</Button>
              ))}
            </Box>
          </Box>
        )}

        {/* Answer section - takes the rest of the space when present */}
        {hasAnswer && (
          <Box sx={{ flex:1, display:'flex', flexDirection:'column', gap:1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Answer</Typography>
              <Box display="flex" gap={1}>
                <Button variant="contained" color="secondary">Save Answer</Button>
                <Button variant="outlined" onClick={onNewQuestion}>New Question</Button>
              </Box>
            </Box>
            <Paper sx={{ p:2, flex:1, overflow:'auto' }}>
              {lastUser && (
                <Box sx={{ mb:2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Your question</Typography>
                  <Typography variant="body1" sx={{ mt:0.5 }}>{lastUser.text as string}</Typography>
                </Box>
              )}
              <TextualExplanation response={lastBot.text} />
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
}
