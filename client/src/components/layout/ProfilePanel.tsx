import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import {
  RiUser3Line,
  RiGoogleFill,
  RiBarChart2Line,
  RiFocus3Line,
  RiSave3Line,
  RiMedalLine,
  RiLineChartLine,
  RiInformationLine,
} from "react-icons/ri";

export default function ProfilePanel() {
  return (
    <Box
      sx={{
        height: "100%",
        borderLeft: { xs: 0, sm: 1 },
        borderTop: { xs: 1, sm: 0 },
        borderColor: "divider",
        display: "block",
        p: 1,
        flexShrink: 0,
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          height: "100%",
          borderRadius: 2,
          overflow: "auto",
          maxHeight: { xs: "300px", sm: "100%" },
        }}
      >
        {/* Header with avatar */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
            <RiUser3Line size={18} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1 }}>
              Student Profile
            </Typography>
            <Typography variant="caption" color="text.secondary">
              KnowliHub - MathPrepreq
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {/* Sign In Section */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Sign in to track your progress
          </Typography>

          <Button
            variant="contained"
            size="large"
            startIcon={<RiGoogleFill />}
            sx={{
              bgcolor: "#4285F4",
              color: "white",
              px: 3,
              py: 1.25,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "0.95rem",
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(66,133,244,0.32)",
              "&:hover": {
                bgcolor: "#3367D6",
                boxShadow: "0 6px 12px rgba(66,133,244,0.38)",
              },
            }}
            onClick={() => {
              // TODO: Implement Google OAuth
              alert("Google Sign-In will be implemented soon!");
            }}
          >
            Sign in with Google
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Access personalized learning paths and track your progress
          </Typography>
        </Box>

        {/* Features Preview */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="subtitle1"
            sx={{
              mb: 2,
              fontWeight: "medium",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <RiInformationLine /> What you'll get
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <RiBarChart2Line color="#1976d2" />
              <Typography variant="body2">
                Personalized progress tracking
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <RiFocus3Line color="#1976d2" />
              <Typography variant="body2">
                Custom learning recommendations
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <RiSave3Line color="#1976d2" />
              <Typography variant="body2">
                Save and revisit your answers
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <RiMedalLine color="#1976d2" />
              <Typography variant="body2">
                Achievement badges and milestones
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <RiLineChartLine color="#1976d2" />
              <Typography variant="body2">
                Detailed learning analytics
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Guest Mode Info */}
        <Box
          sx={{
            p: 2,
            bgcolor: "grey.50",
            borderRadius: 2,
            border: 1,
            borderColor: "grey.200",
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "medium" }}>
            Currently in Guest Mode
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your progress is saved locally in this browser. Sign in to sync
            across devices and access advanced features.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
