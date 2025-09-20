import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import HistoryIcon from '@mui/icons-material/History';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MapIcon from '@mui/icons-material/Map';
import SchoolIcon from '@mui/icons-material/School';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

export type ViewType = 'chat' | 'map' | 'learn';

interface NavigationBarProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onHistoryToggle: () => void;
  onProfileToggle: () => void;
  profileOpen: boolean;
}

export default function NavigationBar({
  view,
  onViewChange,
  onHistoryToggle,
  onProfileToggle,
  profileOpen
}: NavigationBarProps) {
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      p: 1,
      borderBottom: 1,
      borderColor: 'divider'
    }}>
      <IconButton aria-label="toggle history" onClick={onHistoryToggle} sx={{ mr: 1, color: 'primary.main' }}>
        <HistoryIcon />
      </IconButton>

      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={(_, v) => v && onViewChange(v)}
        size="small"
        sx={{ bgcolor: 'transparent' }}
      >
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
        <IconButton aria-label="toggle profile panel" onClick={onProfileToggle} sx={{ color: 'primary.main' }}>
          {profileOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>
    </Box>
  );
}