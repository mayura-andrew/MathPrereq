import React from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
  title?: string;
}

export default function AppLayout({
  children,
  sidebar,
  sidebarOpen = false,
  onSidebarToggle,
  title = 'Math Learning'
}: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh', // Use dynamic viewport height
      width: '100%',
      position: 'relative'
    }}>
      {/* Mobile AppBar */}
      {isMobile && (
        <AppBar
          position="sticky"
          color="transparent"
          sx={{
            top: 0,
            boxShadow: 'none',
            borderBottom: 1,
            borderColor: 'divider',
            backdropFilter: 'blur(6px)',
            zIndex: theme.zIndex.appBar
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
            {sidebar && onSidebarToggle && (
              <IconButton edge="start" color="inherit" aria-label="open sidebar" onClick={onSidebarToggle}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flex: 1 }} noWrap>
              {title}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Main content area */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        {sidebar && (
          <>
            {isMobile ? (
              <Drawer
                anchor="left"
                open={sidebarOpen}
                onClose={onSidebarToggle}
                sx={{
                  '& .MuiDrawer-paper': {
                    width: { xs: '280px', sm: '300px' },
                    top: { xs: '56px', sm: '64px' },
                    height: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)' }
                  }
                }}
              >
                <Box role="presentation" sx={{ height: '100%', overflow: 'auto' }}>
                  {sidebar}
                </Box>
              </Drawer>
            ) : (
              <Box sx={{
                width: sidebarOpen ? { xs: '280px', sm: '320px', md: '360px' } : 0,
                transition: 'width 200ms ease',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {sidebarOpen && (
                  <Box sx={{ p: 1, height: '100%', overflow: 'auto' }}>
                    {sidebar}
                  </Box>
                )}
              </Box>
            )}
          </>
        )}

        {/* Main content */}
        <Box sx={{
          flex: 1,
          minWidth: 0,
          pt: isMobile ? 0 : 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}