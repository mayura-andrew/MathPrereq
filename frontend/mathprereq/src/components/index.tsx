import React, { useState, Suspense } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import HistoryIcon from '@mui/icons-material/History';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import Chat from './Chat';
import type { Message, QueryResponse } from '../types/api';
import History from './History';
import MapIcon from '@mui/icons-material/Map';
import CircularProgress from '@mui/material/CircularProgress';
import ConceptMap from './ConceptMap';
import { mathAPI } from '../services/api';
import SchoolIcon from '@mui/icons-material/School';
import LearnView from './LearnView';
import Button from '@mui/material/Button';

// Calm color theme for the research UI
const customTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563EB' }, // calm blue
    secondary: { main: '#10B981' }, // soft green
    background: { default: '#F6FAFF', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#475569' }
  },
  shape: { borderRadius: 10 },
});

export default function MathLearningApp() {
  const isMobile = useMediaQuery(customTheme.breakpoints.down('sm'));

  // UI state
  const [view, setView] = useState<'chat' | 'map' | 'learn'>('chat');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false); // new state for right panel

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now(), text: input, role: 'user' };
    setMessages(m => [...m, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Use real API call
      const response = await mathAPI.processQuery(input.trim());

      const botMessage: Message = {
        id: Date.now() + 1,
        text: response,
        role: 'bot'
      };

      setMessages(m => [...m, botMessage]);
    } catch (error) {
      console.error('API Error:', error);

      // Fallback to mock response on error
      const mockResponse: QueryResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        request_id: 'fallback-' + Date.now(),
        timestamp: new Date().toISOString(),
        query: input,
        identified_concepts: [],
        learning_path: {
          concepts: [],
          total_concepts: 0,
        },
        explanation: 'Sorry, there was an error processing your question. Please try again.',
        retrieved_context: [],
        processing_time: '0.00s',
      };

      const botMessage: Message = {
        id: Date.now() + 1,
        text: mockResponse,
        role: 'bot'
      };

      setMessages(m => [...m, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const onHistorySelect = (text: string) => {
    setInput(text);
    setView('chat');
    if (isMobile) setHistoryOpen(false);
  };

  const topOffset = isMobile ? 56 : 0; // mobile AppBar height

  // Extract learning path from last bot message
  const lastBot = [...messages].reverse().find(m => m.role === 'bot');
  const learningPathData = lastBot ? ((lastBot.text as QueryResponse)?.learning_path) : null;

  // Layout helpers
  const renderMain = (
    <Box sx={{ height: `calc(100vh - ${topOffset}px)`, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton aria-label="toggle history" onClick={() => setHistoryOpen(v => !v)} sx={{ mr: 1, color: 'primary.main' }}>
          <HistoryIcon />
        </IconButton>

        <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small" sx={{ bgcolor: 'transparent' }}>
          <ToggleButton value="chat" aria-label="chat" sx={{ textTransform: 'none' }}>
            <ChatBubbleOutlineIcon sx={{ mr: 1, color: 'primary.main' }} /> Chat
          </ToggleButton>
          <ToggleButton value="map" aria-label="map" sx={{ textTransform: 'none' }}>
            <MapIcon sx={{ mr: 1, color: 'primary.main' }} /> Map
          </ToggleButton>
          <ToggleButton value="learn" aria-label="learn" sx={{ textTransform: 'none' }}>
            <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} /> Learn
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ mr: 1, color: 'text.primary' }}>
            Profile
          </Typography>
          <IconButton aria-label="toggle profile panel" onClick={() => setRightPanelOpen(v => !v)} sx={{ color: 'primary.main' }}>
            {rightPanelOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Box sx={{ flex: 1, minWidth: 320, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper', height: `calc(100vh - ${topOffset}px)`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {view === 'chat' ? (
            <Chat messages={messages} input={input} setInput={setInput} onSubmit={onSubmit} isLoading={isLoading} onNewQuestion={function (): void {
              setMessages([]);
              setInput('');
            } } />
          ) : view === 'learn' ? (
            <LearnView
              learningPathData={learningPathData}
            />
          ) : (
            <Suspense fallback={<Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}><CircularProgress /></Box>}>
              <ConceptMap concepts={learningPathData?.concepts || []} />
            </Suspense>
          )}
        </Box>

        {/* Right within center: details when concept selected */}
        {rightPanelOpen && (
          <Box sx={{ width: 360, borderLeft: 1, borderColor: 'divider', display: { xs: 'none', sm: 'block' }, p:1 }}>
            <Paper variant="outlined" sx={{ p: 2, height: `calc(100vh - ${topOffset}px)`, borderRadius: 2, overflow: 'auto' }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                👤 Student Profile
              </Typography>

              {/* Sign In Section */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                  Sign in to track your progress
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: '#4285F4',
                    color: 'white',
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 'medium',
                    boxShadow: '0 2px 4px rgba(66, 133, 244, 0.3)',
                    '&:hover': {
                      bgcolor: '#3367D6',
                      boxShadow: '0 4px 8px rgba(66, 133, 244, 0.4)',
                    },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                  onClick={() => {
                    // TODO: Implement Google OAuth
                    alert('Google Sign-In will be implemented soon!');
                  }}
                >
                  <Box
                    component="img"
                    src="https://developers.google.com/identity/images/g-logo.png"
                    alt="Google"
                    sx={{ width: 20, height: 20 }}
                  />
                  Sign in with Google
                </Button>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Access personalized learning paths and track your progress
                </Typography>
              </Box>

              {/* Features Preview */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
                  ✨ What you'll get:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ color: 'primary.main', fontSize: '1.2rem' }}>📊</Typography>
                    <Typography variant="body2">Personalized progress tracking</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ color: 'primary.main', fontSize: '1.2rem' }}>🎯</Typography>
                    <Typography variant="body2">Custom learning recommendations</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ color: 'primary.main', fontSize: '1.2rem' }}>💾</Typography>
                    <Typography variant="body2">Save and revisit your answers</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ color: 'primary.main', fontSize: '1.2rem' }}>🏆</Typography>
                    <Typography variant="body2">Achievement badges and milestones</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ color: 'primary.main', fontSize: '1.2rem' }}>📈</Typography>
                    <Typography variant="body2">Detailed learning analytics</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Guest Mode Info */}
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Currently in Guest Mode
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your progress is saved locally in this browser. Sign in to sync across devices and access advanced features.
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={customTheme}>
      <Box sx={{ position: 'fixed', inset: 0, display: 'flex', width: '100%', height: '100vh', bgcolor: 'background.default' }}>
        {/* AppBar for mobile to open drawers and show title */}
        {isMobile && (
          <AppBar position="fixed" color="transparent" sx={{ top: 0, boxShadow: 'none', borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(6px)' }}>
            <Toolbar>
              <IconButton edge="start" color="inherit" aria-label="open history" onClick={() => setHistoryOpen(true)}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" sx={{ flex: 1 }} noWrap>Math Learning</Typography>
              {/* resources drawer removed - use concept details panel instead */}
            </Toolbar>
          </AppBar>
        )}

        {/* Left: History (drawer on mobile; collapsible on desktop) */}
        {isMobile ? (
          <Drawer anchor="left" open={historyOpen} onClose={() => setHistoryOpen(false)}>
            <Box sx={{ width: 300 }} role="presentation">
              <History messages={messages} onSelect={onHistorySelect} />
            </Box>
          </Drawer>
        ) : (
          // Desktop: show full panel when open, otherwise a compact toggle column
          historyOpen ? (
            <Box sx={{ width: 300, p: 1, transition: 'width 200ms ease' }}>
              <Paper sx={{ height: `calc(100vh - ${topOffset}px)`, borderRadius: 2, overflow: 'hidden' }}>
                <History messages={messages} onSelect={onHistorySelect} />
              </Paper>
            </Box>
          ) : (
            <Box sx={{ width: 56, display: 'flex', alignItems: 'flex-start', p: 1 }}>
              <IconButton aria-label="open history" onClick={() => setHistoryOpen(true)}>
                <ChevronRightIcon />
              </IconButton>
            </Box>
          )
        )}

        {/* Main center. Use padding-top to offset the mobile AppBar and ensure children can scroll. */}
        <Box sx={{ flex: 1, ml: isMobile ? 0 : 0, pt: isMobile ? '56px' : 0, overflow: 'hidden' }}>
          {renderMain}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
