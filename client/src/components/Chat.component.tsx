import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { Message } from '../types/api';
import { MessageInput, AnswerDisplay, ExampleQuestions } from './chat';

export default function Chat({ messages, input, setInput, onSubmit, isLoading, onNewQuestion }:
  { messages: Message[]; input: string; setInput: (v:string)=>void; onSubmit: (e?:React.FormEvent)=>void; isLoading: boolean; onNewQuestion: () => void }){
  const [showInput, setShowInput] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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
            <MessageInput
              value={input}
              onChange={setInput}
              onSubmit={onSubmit}
              isLoading={isLoading}
            />

            {isLoading && (
              <Box display="flex" alignItems="center" gap={1} mt={2}>
                <Typography variant="body2">Thinking...</Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* Examples - only show if no answer yet */}
        {!hasAnswer && !isLoading && (
          <ExampleQuestions onSelectQuestion={setInput} />
        )}

        {/* Answer section - takes the rest of the space when present */}
        {hasAnswer && lastUser && lastBot && (
          <AnswerDisplay
            userMessage={lastUser}
            botMessage={lastBot}
            onSave={handleSaveAnswer}
            onNewQuestion={handleNewQuestion}
            saveStatus={saveStatus}
          />
        )}
      </Box>
    </Box>
  );
}
