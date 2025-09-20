import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function ProfilePanel() {
  return (
    <Box sx={{
      height: '100%',
      borderLeft: { xs: 0, sm: 1 },
      borderTop: { xs: 1, sm: 0 },
      borderColor: 'divider',
      display: 'block',
      p: 1,
      flexShrink: 0
    }}>
      <Paper variant="outlined" sx={{
        p: 2,
        height: '100%',
        borderRadius: 2,
        overflow: 'auto',
        maxHeight: { xs: '300px', sm: '100%' }
      }}>
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
  );
}