import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { RiBookOpenLine } from "react-icons/ri";

// Lightweight wrapper that tries to use lottie-react if available.
type Props = { size?: number; label?: string; src?: string };

export default function ThinkingAnimation({
  size = 140,
  label = "Thinking…",
  src,
}: Props) {
  const [LottieComp, setLottieComp] = useState<any>(null);
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    // Try to dynamically import lottie-react; fail gracefully if not installed
    import("lottie-react")
      .then((mod) => {
        if (!mounted) return;
        setLottieComp(() => mod.default || (mod as any));
        // Attempt to load animation JSON from provided src or default
        const path = src || "/animations/reading.json";
        fetch(path)
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (!mounted) return;
            setAnimationData(json);
          })
          .catch(() => void 0);
      })
      .catch(() => void 0);

    return () => {
      mounted = false;
    };
  }, []);

  if (LottieComp && animationData) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        <LottieComp
          animationData={animationData}
          loop
          style={{ width: size, height: size }}
        />
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    );
  }

  // Fallback: icon + spinner
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.25,
      }}
    >
      <RiBookOpenLine size={Math.max(20, Math.floor(size * 0.18))} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <CircularProgress size={Math.max(16, Math.floor(size * 0.14))} />
    </Box>
  );
}
