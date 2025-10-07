import React, { useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { appTheme } from "../theme";
import { useChat } from "../hooks/useChat";
import { useLearningPath } from "../hooks/useLearningPath";
import { AppLayout, NavigationBar, ProfilePanel, MainContent } from "./layout";
import type { ViewType } from "./layout";

export default function MathLearningApp() {
  // UI state
  const [view, setView] = useState<ViewType>("chat");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Use custom hooks
  const { messages, input, setInput, isLoading, sendMessage, clearMessages } =
    useChat();
  const { learningPathData } = useLearningPath(messages);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    await sendMessage(input);
  };

  const onNewQuestion = () => {
    clearMessages();
  };

  // Sidebar: constrain width and allow vertical scrolling
  const sidebar = (
    <Paper
      sx={{
        // changed: constrain width and enable internal scroll
        width: { xs: "100%", sm: 300 },
        maxWidth: 360,
        boxSizing: "border-box",
        height: "100%",
        borderRadius: 2,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    ></Paper>
  );

  const navigationBar = (
    <NavigationBar
      view={view}
      onViewChange={setView}
      onHistoryToggle={() => setHistoryOpen((v) => !v)}
      onProfileToggle={() => setRightPanelOpen((v) => !v)}
      profileOpen={rightPanelOpen}
    />
  );

  const mainContent = (
    <MainContent
      view={view}
      messages={messages}
      input={input}
      setInput={setInput}
      onSubmit={onSubmit}
      isLoading={isLoading}
      onNewQuestion={onNewQuestion}
      learningPathData={learningPathData}
    />
  );

  const profilePanel = (
    <Box
      sx={{
        width: rightPanelOpen ? { xs: "100%", sm: 360 } : 0,
        maxWidth: 360,
        display: rightPanelOpen ? "block" : "none",
        transition: "width 200ms ease",
        overflowY: "auto",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {rightPanelOpen && <ProfilePanel />}
    </Box>
  );

  return (
    <ThemeProvider theme={appTheme}>
      {/* changed: constrain overall app to viewport to prevent uncontrolled growth */}
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <AppLayout
          sidebar={sidebar}
          sidebarOpen={historyOpen}
          onSidebarToggle={() => setHistoryOpen((v) => !v)}
        >
          {/* changed: ensure inner layout fills available space and allows children to shrink */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {navigationBar}
            {/* changed: main horizontal area */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {/* Sidebar wrapper: keep responsive behavior but avoid forcing layout width */}
              <Box
                sx={{
                  flexShrink: 0,
                  display: { xs: historyOpen ? "block" : "none", sm: "block" },
                  boxSizing: "border-box",
                }}
              ></Box>

              {/* Main content wrapper: allow proper shrinking and internal scrolling */}
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {mainContent}
              </Box>

              {/* Profile panel: constrained width and scrollable */}
              {profilePanel}
            </Box>
          </Box>
        </AppLayout>
      </Box>
    </ThemeProvider>
  );
}
