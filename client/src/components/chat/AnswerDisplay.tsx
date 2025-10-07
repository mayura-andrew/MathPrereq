import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import { RiSaveLine, RiRefreshLine } from "react-icons/ri";
import type { Message, QueryResponse } from "../../types/api";
import TextualExplanation from "../TextualExplanation.component";

interface AnswerDisplayProps {
  userMessage: Message;
  botMessage: Message;
  onSave: () => void;
  onNewQuestion: () => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

export default function AnswerDisplay({
  userMessage,
  botMessage,
  onSave,
  onNewQuestion,
  saveStatus,
}: AnswerDisplayProps) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        minHeight: 0,
        height: "100%",
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Answer
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<RiSaveLine />}
            onClick={onSave}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
              ? "Saved!"
              : saveStatus === "error"
              ? "Error"
              : "Save Answer"}
          </Button>
          <Button
            variant="outlined"
            onClick={onNewQuestion}
            startIcon={<RiRefreshLine />}
          >
            New Question
          </Button>
        </Box>
      </Box>
      <Paper
        sx={{
          p: 2,
          flex: 1,
          overflow: "auto",
          height: "100%",
          minHeight: { xs: 300, sm: 400 },
          display: "flex",
          flexDirection: "column",
          wordWrap: "break-word",
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          gap: 1.5,
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "rgba(0,0,0,0.1)",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: "4px",
          },
        }}
      >
        {userMessage && (
          <Box sx={{ mb: 2, flexShrink: 0 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Your question
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {userMessage.text as string}
            </Typography>
          </Box>
        )}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <TextualExplanation response={botMessage.text as QueryResponse} />
        </Box>
      </Paper>
    </Box>
  );
}
