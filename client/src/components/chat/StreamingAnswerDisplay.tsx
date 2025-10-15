/**
 * StreamingAnswerDisplay Component
 * 
 * Enhanced AnswerDisplay component with streaming support
 */

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import { RiSaveLine, RiRefreshLine, RiStopCircleLine } from 'react-icons/ri';
import type { Message, QueryResponse } from '../../types/api';
import type { StreamState } from '../../types/streaming';
import TextualExplanation from '../TextualExplanation.component';
import StreamProgress from './StreamProgress';

interface StreamingAnswerDisplayProps {
  userMessage: Message;
  botMessage: Message;
  streamState: StreamState;
  onSave: () => void;
  onNewQuestion: () => void;
  onCancelStream?: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export default function StreamingAnswerDisplay({
  userMessage,
  botMessage,
  streamState,
  onSave,
  onNewQuestion,
  onCancelStream,
  saveStatus,
}: StreamingAnswerDisplayProps) {
  const response = typeof botMessage.text === 'object' ? botMessage.text as QueryResponse : null;
  const isStreaming = streamState.isStreaming || response?.is_streaming;

  // Debug logging
  console.log('🎨 StreamingAnswerDisplay render:', {
    botMessageText: botMessage.text,
    botMessageType: typeof botMessage.text,
    response: response,
    responseExplanation: response?.explanation,
    responseExplanationLength: response?.explanation?.length,
    isStreaming,
    streamStateIsStreaming: streamState.isStreaming,
    responseIsStreaming: response?.is_streaming,
  });

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minHeight: 0,
        height: '100%',
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Answer
        </Typography>
        <Box display="flex" gap={1}>
          {isStreaming && onCancelStream && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<RiStopCircleLine />}
              onClick={onCancelStream}
              size="small"
            >
              Cancel
            </Button>
          )}
          {!isStreaming && (
            <>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<RiSaveLine />}
                onClick={onSave}
                disabled={saveStatus === 'saving'}
                size="small"
              >
                {saveStatus === 'saving'
                  ? 'Saving...'
                  : saveStatus === 'saved'
                  ? 'Saved!'
                  : saveStatus === 'error'
                  ? 'Error'
                  : 'Save Answer'}
              </Button>
              <Button
                variant="outlined"
                onClick={onNewQuestion}
                startIcon={<RiRefreshLine />}
                size="small"
              >
                New Question
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Content */}
      <Paper
        sx={{
          p: 2,
          flex: 1,
          overflow: 'auto',
          height: '100%',
          minHeight: { xs: 300, sm: 400 },
          display: 'flex',
          flexDirection: 'column',
          wordWrap: 'break-word',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          gap: 1.5,
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
        }}
      >
        {/* User Question */}
        {userMessage && (
          <Box sx={{ mb: 1, flexShrink: 0 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Your question
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {userMessage.text as string}
            </Typography>
          </Box>
        )}

        {/* Streaming Progress */}
        {isStreaming && <StreamProgress streamState={streamState} />}

        {/* Response Content */}
        {response && (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <TextualExplanation response={response} />
          </Box>
        )}
        

        {/* Error Display */}
        {response?.error && !isStreaming && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'error.light',
              borderRadius: 1,
              color: 'error.contrastText',
            }}
          >
            <Typography variant="body2">
              <strong>Error:</strong> {response.error}
            </Typography>
          </Box>
        )}

        {/* Empty State */}
        {!response && !isStreaming && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">
              Waiting for response...
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
