import React, { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { Message } from "../types/api";
import { MessageInput, AnswerDisplay, ExampleQuestions } from "./chat";
import { BlinkingThinking } from "./ui";

export default function Chat({
  messages,
  input,
  setInput,
  onSubmit,
  isLoading,
  onNewQuestion,
}: {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  onNewQuestion: () => void;
}) {
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const handleNewQuestion = () => {
    onNewQuestion();
  };

  const handleSaveAnswer = async () => {
    const lastBot = [...messages].reverse().find((m) => m.role === "bot");
    const lastUser = [...messages].reverse().find((m) => m.role === "user");

    if (!lastBot || !lastUser) return;

    setSaveStatus("saving");

    try {
      const answerData = {
        question: lastUser.text,
        answer: lastBot.text,
        timestamp: new Date().toISOString(),
        id: Date.now(),
      };

      // Save to localStorage
      const savedAnswers = JSON.parse(
        localStorage.getItem("savedAnswers") || "[]"
      );
      savedAnswers.push(answerData);
      localStorage.setItem("savedAnswers", JSON.stringify(savedAnswers));

      setSaveStatus("saved");

      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Failed to save answer:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // find last user question and last bot response
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastBot = [...messages].reverse().find((m) => m.role === "bot");
  const hasAnswer = !!lastBot;

  return (
    <Box
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 900,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
        }}
      >
        {/* App Title */}
        <Box sx={{ py: 1.5, textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
  KnowliHub - MathPrepreq 🧮
          </Typography>
        </Box>

        {/* Scrollable content area: suggestions at top, then answer if any */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflow: "auto",
            pb: 2,
          }}
        >
          {!hasAnswer && !isLoading && (
            <ExampleQuestions onSelectQuestion={setInput} />
          )}

          {/* No hero animation per request */}

          {hasAnswer && lastUser && lastBot && (
            <AnswerDisplay
              userMessage={lastUser}
              botMessage={lastBot}
              onSave={handleSaveAnswer}
              onNewQuestion={handleNewQuestion}
              saveStatus={saveStatus}
            />
          )}
        </Box>

        {/* Sticky input at the bottom */}
        <Box
          sx={{
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
            position: "sticky",
            bottom: 0,
            bgcolor: "transparent",
          }}
        >
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
          >
            {isLoading && (
              <Box sx={{ mb: 1, textAlign: "center" }}>
                <BlinkingThinking label="Thinking" />
              </Box>
            )}

            <MessageInput
              value={input}
              onChange={setInput}
              onSubmit={onSubmit}
              isLoading={isLoading}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
