import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import {
  RiHistoryLine,
  RiChat3Line,
  RiMapLine,
  RiSchoolLine,
  RiUser3Line,
} from "react-icons/ri";

export type ViewType = "chat" | "map" | "learn";

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
  profileOpen,
}: NavigationBarProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 1,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <IconButton
        aria-label="toggle history"
        onClick={onHistoryToggle}
        sx={{ mr: 1, color: "primary.main" }}
      >
        <RiHistoryLine />
      </IconButton>

      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={(_, v) => v && onViewChange(v)}
        size="small"
        sx={{ bgcolor: "transparent" }}
      >
        <ToggleButton
          value="chat"
          aria-label="chat"
          sx={{ textTransform: "none" }}
        >
          <RiChat3Line style={{ marginRight: 8, color: "#1976d2" }} /> Chat
        </ToggleButton>
        <ToggleButton
          value="map"
          aria-label="map"
          sx={{ textTransform: "none" }}
        >
          <RiMapLine style={{ marginRight: 8, color: "#1976d2" }} /> Map
        </ToggleButton>
        <ToggleButton
          value="learn"
          aria-label="learn"
          sx={{ textTransform: "none" }}
        >
          <RiSchoolLine style={{ marginRight: 8, color: "#1976d2" }} /> Learn
        </ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ px: 1, display: "flex", alignItems: "center" }}>
        <Typography variant="subtitle1" sx={{ mr: 1, color: "text.primary" }}>
          Profile
        </Typography>
        <IconButton
          aria-label="toggle profile panel"
          onClick={onProfileToggle}
          sx={{
            color: profileOpen ? "primary.contrastText" : "primary.main",
            bgcolor: profileOpen ? "primary.main" : "transparent",
            "&:hover": {
              bgcolor: profileOpen ? "primary.dark" : "action.hover",
            },
          }}
        >
          <RiUser3Line />
        </IconButton>
      </Box>
    </Box>
  );
}
