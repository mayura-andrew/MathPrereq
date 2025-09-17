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
import Chat from './Chat';
import type { Message as MessageType } from './Chat';
const ConceptMap = React.lazy(() => import('./ConceptMap'));
import type { Concept } from './ConceptMap';
import Resources from './Resources';
import History from './History';
import MapIcon from '@mui/icons-material/Map';
import CircularProgress from '@mui/material/CircularProgress';

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
  components: {
    MuiPaper: { styleOverrides: { root: { borderRadius: 10 } } },
  }
});

type Resource = { id: number; title: string; type: string; source?: string; duration?: string; url?: string; difficulty?: string };

export default function MathLearningApp() {
  const isMobile = useMediaQuery(customTheme.breakpoints.down('sm'));

  // UI state
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'chat' | 'map'>('chat');
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const onSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input) return;
    const next: MessageType = { id: Date.now(), text: input, role: 'user' };
    setMessages(m => [...m, next]);
    setInput('');
    setIsLoading(true);
    // simulate async bot reply
    setTimeout(() => {
      setMessages(m => [...m, { id: Date.now() + 1, text: 'This is an automated reply.', role: 'bot' }]);
      setIsLoading(false);
    }, 700);
  }, [input]);

  // Concept map data
  const [concepts] = useState<Concept[]>(() => [
    { id: 1, title: 'Algebra', description: 'Variables, equations, manipulation' },
    { id: 2, title: 'Calculus', description: 'Limits, derivatives, integrals' },
    { id: 3, title: 'Precalculus', description: 'Functions, trig, basics' },
  ]);

  const onSelectConcept = useCallback((c: Concept) => {
    setSelectedConcept(c);
    setMessages(m => [...m, { id: Date.now(), text: `Selected concept: ${c.title}`, role: 'user' }]);
  }, []);

  const onHistorySelect = useCallback((text: string) => {
    setInput(text);
    setView('chat');
    if (isMobile) setHistoryOpen(false);
  }, [isMobile]);

  // Layout helpers
  const renderMain = (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
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
            {selectedConcept ? selectedConcept.title : 'Learning Path'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Box sx={{ flex: 1, minWidth: 320, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          {view === 'chat' ? (
            <Chat messages={messages} input={input} setInput={setInput} onSubmit={onSubmit} isLoading={isLoading} />
          ) : (
            <Suspense fallback={<Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}><CircularProgress /></Box>}>
              <ConceptMap concepts={concepts} onSelect={onSelectConcept} />
            </Suspense>
          )}
        </Box>

        {/* Right within center: details when concept selected */}
        <Box sx={{ width: 360, borderLeft: 1, borderColor: 'divider', display: { xs: 'none', sm: 'block' }, p:1 }}>
          {/* Details panel: when a concept is selected show details and related resources */}
          {selectedConcept ? (
            <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
              <Typography variant="h6">{selectedConcept.title}</Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>{selectedConcept.description}</Typography>
              {/* Ideally show curated resources related to this concept */}
              <Resources resources={filteredResources} onSearch={onSearch} selectedConcept={selectedConcept} />
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
              <Typography variant="h6">Overview</Typography>
              <Typography color="text.secondary">Select a concept to see details and resources.</Typography>
            </Paper>
          )}
        </Box>
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
              <Paper sx={{ height: '100%', borderRadius: 2, overflow: 'hidden' }}>
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
