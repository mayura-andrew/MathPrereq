import React, { useRef, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import TextualExplanation from './TextualExplanation';
import type { Message, QueryResponse } from '../types/api';

export default function Chat({ messages, input, setInput, onSubmit, isLoading, onNewQuestion }:
  { messages: Message[]; input: string; setInput: (v:string)=>void; onSubmit: (e?:React.FormEvent)=>void; isLoading: boolean; onNewQuestion: () => void }){
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showInput, setShowInput] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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

  const handleNewQuestion = () => {
    setShowInput(true);
    onNewQuestion();
  };

  const handleSaveAnswer = async () => {
    const lastBot = [...messages].reverse().find(m => m.role === 'bot');
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    
    if (!lastBot || !lastUser) return;

    setSaveStatus('saving');
    
    try {
      const answerData = {
        question: lastUser.text,
        answer: lastBot.text,
        timestamp: new Date().toISOString(),
        id: Date.now()
      };
      
      // Save to localStorage
      const savedAnswers = JSON.parse(localStorage.getItem('savedAnswers') || '[]');
      savedAnswers.push(answerData);
      localStorage.setItem('savedAnswers', JSON.stringify(savedAnswers));
      
      setSaveStatus('saved');
      
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save answer:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const exampleQuestions = [
    'How do I solve quadratic equations?',
    'What is the chain rule in calculus?',
    'Explain matrix multiplication',
    'How do I find derivatives of trigonometric functions?',
    'What is the Pythagorean theorem?',
    'How do I solve systems of linear equations?'
  ];

  // find last user question and last bot response
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const lastBot = [...messages].reverse().find(m => m.role === 'bot');
  const hasAnswer = !!lastBot;

  // Hide input when we have an answer
  useEffect(() => {
    if (hasAnswer) {
      setShowInput(false);
    }
  }, [hasAnswer]);

  return (
    <Box sx={{
      p:2,
      height: '100%',
      display:'flex',
      flexDirection:'column',
      alignItems:'center',
      justifyContent: hasAnswer ? 'flex-start' : 'center',
      gap:2,
      minHeight: 0 // Important for flex scrolling
    }}>
      <Box sx={{
        width: '100%',
        maxWidth: 900,
        display:'flex',
        flexDirection:'column',
        gap:2,
        height: '100%',
        minHeight: 0 // Important for flex scrolling
      }}>
        {/* Input section - only show when no answer or explicitly requested */}
        {showInput && (
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
        )}

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
          <Box sx={{
            flex:1,
            display:'flex',
            flexDirection:'column',
            gap:1,
            minHeight: 0,
            height: '100%'
          }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Answer</Typography>
              <Box display="flex" gap={1}>
                <Button 
                  variant="contained" 
                  color="secondary" 
                  startIcon={<SaveIcon />} 
                  onClick={handleSaveAnswer}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? 'Saving...' : 
                   saveStatus === 'saved' ? 'Saved!' : 
                   saveStatus === 'error' ? 'Error' : 
                   'Save Answer'}
                </Button>
                <Button variant="outlined" onClick={handleNewQuestion} startIcon={<RefreshIcon />}>New Question</Button>
              </Box>
            </Box>
            <Paper sx={{
              p:2,
              flex:1,
              overflow:'auto',
              height: '100%',
              minHeight: 400,
              maxHeight: 'calc(100vh - 300px)', // Ensure it doesn't exceed viewport
              display: 'flex',
              flexDirection: 'column',
              wordWrap: 'break-word',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
              },
            }}>
              {lastUser && (
                <Box sx={{ mb:2, flexShrink: 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">Your question</Typography>
                  <Typography variant="body1" sx={{ mt:0.5 }}>{lastUser.text as string}</Typography>
                </Box>
              )}
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <TextualExplanation response={lastBot.text as QueryResponse} />
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
}
