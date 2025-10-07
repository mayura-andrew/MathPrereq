import { createTheme } from '@mui/material/styles';

// Calm color theme for the research UI
export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563EB' }, // calm blue
    secondary: { main: '#10B981' }, // soft green
    background: { default: '#F6FAFF', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#475569' }
  },
  shape: { borderRadius: 10 },
});