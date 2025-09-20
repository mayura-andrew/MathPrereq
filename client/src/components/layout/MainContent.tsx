import React, { Suspense } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Chat from '../Chat.component';
import ConceptMap from '../ConceptMap.component';
import LearnView from '../LearnView.component';
import type { Message, LearningPath } from '../../types/api';
import type { ViewType } from './NavigationBar';

interface MainContentProps {
  view: ViewType;
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  onNewQuestion: () => void;
  learningPathData: LearningPath | null;
}

export default function MainContent({
  view,
  messages,
  input,
  setInput,
  onSubmit,
  isLoading,
  onNewQuestion,
  learningPathData
}: MainContentProps) {
  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      minHeight: 0
    }}>
      <Box sx={{
        flex: 1,
        minWidth: { xs: 280, sm: 320 },
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {view === 'chat' ? (
          <Chat
            messages={messages}
            input={input}
            setInput={setInput}
            onSubmit={onSubmit}
            isLoading={isLoading}
            onNewQuestion={onNewQuestion}
          />
        ) : view === 'learn' ? (
          <LearnView learningPathData={learningPathData} />
        ) : (
          <Suspense fallback={
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <CircularProgress />
            </Box>
          }>
            <ConceptMap concepts={learningPathData?.concepts || []} />
          </Suspense>
        )}
      </Box>
    </Box>
  );
}