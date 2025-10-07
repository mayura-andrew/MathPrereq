import React, { useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import { RiSendPlaneFill } from "react-icons/ri";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function MessageInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = "Paste or type a math question...",
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}
    >
      <TextField
        inputRef={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        multiline
        minRows={3}
        maxRows={10}
        fullWidth
        size="medium"
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "1.1rem",
            borderRadius: 2.5,
            backgroundColor: "background.paper",
            "& fieldset": { borderColor: "divider" },
            "&:hover fieldset": { borderColor: "primary.light" },
            "&.Mui-focused fieldset": { borderColor: "primary.main" },
          },
        }}
      />
      <IconButton
        color="primary"
        type="submit"
        disabled={!value.trim() || isLoading}
        sx={{
          bgcolor: "primary.main",
          color: "common.white",
          p: 2,
          borderRadius: 2,
        }}
      >
        {isLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          <RiSendPlaneFill size={24} />
        )}
      </IconButton>
    </Box>
  );
}
