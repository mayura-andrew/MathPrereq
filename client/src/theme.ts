import { createTheme } from "@mui/material/styles";

// Clean, slightly darker blue/white theme (no gradients)
export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563EB" }, // blue
    secondary: { main: "#2563EB" }, // keep palette simple
    background: {
      default: "#EEF2FF", // slightly darker bluish background
      paper: "#FFFFFF",
    },
    text: { primary: "#0B1220", secondary: "#334155" },
  },
  shape: { borderRadius: 10 },
});
