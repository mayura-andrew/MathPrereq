import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { appTheme } from '../theme';
import { useChat } from '../hooks/useChat';
import { useLearningPath } from '../hooks/useLearningPath';
import { AppLayout, NavigationBar, ProfilePanel, MainContent } from './layout';
import type { ViewType } from './layout';
import History from './History.component';

export default function MathLearningApp() {
  // UI state
  const [view, setView] = useState<ViewType>('chat');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Use custom hooks
  const { messages, input, setInput, isLoading, sendMessage, clearMessages } = useChat();
  const { learningPathData } = useLearningPath(messages);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    await sendMessage(input);
  };

  const onHistorySelect = (text: string) => {
    setInput(text);
    setView('chat');
    setHistoryOpen(false);
  };

  const onNewQuestion = () => {
    clearMessages();
  };

  const sidebar = (
    <Paper sx={{
      height: '100%',
      borderRadius: 2,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <History messages={messages} onSelect={onHistorySelect} />
    </Paper>
  );

  const navigationBar = (
    <NavigationBar
      view={view}
      onViewChange={setView}
      onHistoryToggle={() => setHistoryOpen(v => !v)}
      onProfileToggle={() => setRightPanelOpen(v => !v)}
      profileOpen={rightPanelOpen}
    />
  );

  const mainContent = (
    <MainContent
      view={view}
      messages={messages}
      input={input}
      setInput={setInput}
      onSubmit={onSubmit}
      isLoading={isLoading}
      onNewQuestion={onNewQuestion}
      learningPathData={learningPathData}
    />
  );

  const profilePanel = (
    <Box sx={{
      width: rightPanelOpen ? { xs: '100%', sm: 360 } : 0,
      display: rightPanelOpen ? 'block' : 'none',
      transition: 'width 200ms ease',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      {rightPanelOpen && <ProfilePanel />}
    </Box>
  );

  return (
    <ThemeProvider theme={appTheme}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <AppLayout
          sidebar={sidebar}
          sidebarOpen={historyOpen}
          onSidebarToggle={() => setHistoryOpen(v => !v)}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {navigationBar}
            <Box sx={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
              {mainContent}
              {profilePanel}
            </Box>
          </Box>
        </AppLayout>
      </Box>
    </ThemeProvider>
  );
}
