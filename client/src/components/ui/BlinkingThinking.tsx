import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@emotion/react";

const blink = keyframes`
  0% { opacity: 0.2; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-1px); }
  100% { opacity: 0.2; transform: translateY(0); }
`;

export default function BlinkingThinking({
  label = "Thinking",
}: {
  label?: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.5,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ letterSpacing: 0.2 }}
      >
        {label}
        <Box component="span" sx={{ display: "inline-flex", ml: 0.5 }}>
          <Box
            component="span"
            sx={{
              mx: 0.1,
              width: 4,
              height: 4,
              borderRadius: "50%",
              bgcolor: "text.secondary",
              animation: `${blink} 1.2s infinite`,
              display: "inline-block",
            }}
          />
          <Box
            component="span"
            sx={{
              mx: 0.1,
              width: 4,
              height: 4,
              borderRadius: "50%",
              bgcolor: "text.secondary",
              animation: `${blink} 1.2s infinite 0.2s`,
              display: "inline-block",
            }}
          />
          <Box
            component="span"
            sx={{
              mx: 0.1,
              width: 4,
              height: 4,
              borderRadius: "50%",
              bgcolor: "text.secondary",
              animation: `${blink} 1.2s infinite 0.4s`,
              display: "inline-block",
            }}
          />
        </Box>
      </Typography>
    </Box>
  );
}
