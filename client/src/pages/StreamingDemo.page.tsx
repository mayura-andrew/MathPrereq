/**
 * Streaming Demo Page
 * 
 * Example page showing how to use the streaming chat feature
 */

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import { appTheme } from '../theme';
import StreamingChat from '../components/StreamingChat.component';
import { useStreamingChat } from '../hooks/useStreamingChat';

export default function StreamingDemoPage() {
  const {
    messages,
    input,
    setInput,
    isLoading,
    streamState,
    sendMessage,
    cancelStream,
    clearMessages,
  } = useStreamingChat();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    await sendMessage(input);
  };

  const handleNewQuestion = () => {
    clearMessages();
  };

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          bgcolor: 'background.default',
          overflow: 'hidden',
        }}
      >
        <StreamingChat
          messages={messages}
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          streamState={streamState}
          onNewQuestion={handleNewQuestion}
          onCancelStream={cancelStream}
        />
      </Box>
    </ThemeProvider>
  );
}
