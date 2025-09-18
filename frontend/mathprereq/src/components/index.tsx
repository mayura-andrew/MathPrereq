import React, { useMemo, useState, useCallback, useRef, Suspense } from 'react';
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
import Resources from './Resources';
import History from './History';
import MapIcon from '@mui/icons-material/Map';
import CircularProgress from '@mui/material/CircularProgress';
import ConceptMap from './ConceptMap';
import { mathAPI } from '../services/api';

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

type Resource = { id: number; title: string; type: string; source?: string; duration?: string; url?: string; difficulty?: string };

export default function MathLearningApp() {
  const isMobile = useMediaQuery(customTheme.breakpoints.down('sm'));

  // UI state
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'chat' | 'map'>('chat');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false); // new state for right panel

  // Debounced search (client-side only)
  const debounceRef = useRef<number | null>(null);
  const onSearch = useCallback((v: string) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      setQuery(v);
      debounceRef.current = null;
    }, 260);
  }, []);

  const [resources] = useState<Resource[]>(() => [
    { id: 1, title: 'Khan Academy: Precalculus', type: 'video', source: 'Khan Academy', duration: '3h', url: '#', difficulty: 'medium' },
    { id: 2, title: 'MIT OpenCourseWare: Calculus', type: 'lecture', source: 'MIT OCW', duration: '10h', url: '#', difficulty: 'hard' },
    { id: 3, title: 'Intro to Algebra', type: 'article', source: 'Example.edu', duration: '30m', url: '#', difficulty: 'easy' },
  ]);

  const filteredResources = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter(r => (r.title + ' ' + (r.source || '') + ' ' + (r.type || '')).toLowerCase().includes(q));
  }, [query, resources]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const onSubmit = useCallback(async (e?: React.FormEvent) => {
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
  }, [input]);

  const onHistorySelect = useCallback((text: string) => {
    setInput(text);
    setView('chat');
    if (isMobile) setHistoryOpen(false);
  }, [isMobile]);

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
        </ToggleButtonGroup>

        <Box sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ mr: 1, color: 'text.primary' }}>
            Learning Path
          </Typography>
          <IconButton aria-label="toggle right panel" onClick={() => setRightPanelOpen(v => !v)} sx={{ color: 'primary.main' }}>
            {rightPanelOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Box sx={{ flex: 1, minWidth: 320, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper', height: `calc(100vh - ${topOffset}px)` }}>
          {view === 'chat' ? (
            <Chat messages={messages} input={input} setInput={setInput} onSubmit={onSubmit} isLoading={isLoading} onNewQuestion={function (): void {
              setMessages([]);
              setInput('');
            } } />
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
              <Typography variant="h6" sx={{ mb: 2 }}>Learning Path</Typography>
              {learningPathData?.concepts && learningPathData.concepts.length > 0 ? (
                <Box>
                  {learningPathData.concepts.map((concept, index: number) => (
                    <Box key={concept.id || index} sx={{ mb: 2, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle1">{concept.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{concept.description}</Typography>
                      {/* Add resources here if available */}
                      {concept.resources && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption">Resources:</Typography>
                          {concept.resources.map((res, i) => (
                            <Typography key={i} variant="body2">{(res as { title: string }).title}</Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">No learning path available yet. Ask a question to generate one.</Typography>
              )}
              {/* Resources section */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Learning Resources</Typography>
                <Resources resources={filteredResources} onSearch={onSearch} selectedConcept={null} />
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
