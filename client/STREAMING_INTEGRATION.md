# 🌊 Client Streaming Integration Guide

This guide explains how to integrate the streaming API with your React client application.

## 📦 What's Been Added

### 1. **Type Definitions** (`src/types/streaming.ts`)
- Stream event types and interfaces
- Stream state management types
- Event handler types

### 2. **Streaming Service** (`src/services/streaming.ts`)
- `StreamingQueryClient` class for handling SSE connections
- Automatic reconnection and error handling
- Stream cancellation support

### 3. **Custom Hook** (`src/hooks/useStreamingChat.ts`)
- `useStreamingChat()` hook for managing streaming state
- Real-time message updates
- Progress tracking

### 4. **UI Components**
- `StreamProgress.tsx` - Progress bar with live updates
- `StreamingAnswerDisplay.tsx` - Enhanced answer display with streaming support
- `StreamingChat.component.tsx` - Complete chat interface with streaming

## 🚀 Quick Start

### Option 1: Use the Streaming Demo Page

```tsx
// In your App.tsx or router
import StreamingDemoPage from './pages/StreamingDemo.page';

function App() {
  return <StreamingDemoPage />;
}
```

### Option 2: Integrate into Existing Component

```tsx
import { useStreamingChat } from './hooks/useStreamingChat';
import StreamingChat from './components/StreamingChat.component';

function YourComponent() {
  const {
    messages,
    input,
    setInput,
    isLoading,
    streamState,
    sendMessage,
    cancelStream,
    clearMessages,
  } = useStreamingChat();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    await sendMessage(input);
  };

  return (
    <StreamingChat
      messages={messages}
      input={input}
      setInput={setInput}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      streamState={streamState}
      onNewQuestion={clearMessages}
      onCancelStream={cancelStream}
    />
  );
}
```

## 📊 Stream State Object

The `streamState` object provides real-time updates:

```typescript
interface StreamState {
  isStreaming: boolean;           // Currently streaming
  queryId: string | null;          // Current query ID
  progress: number;                // 0-100
  stage: string;                   // Current stage message
  currentStep: number;             // Current step (1-5)
  totalSteps: number;              // Total steps (5)
  concepts: string[];              // Identified concepts
  prerequisites: PrerequisiteItem[]; // Prerequisites
  contextChunks: string[];         // Retrieved context
  resources: ResourceItem[];       // Learning resources
  explanation: string;             // Streaming explanation
  error: string | null;            // Error message
  processingTime: number | null;   // Processing time (ns)
  completed: boolean;              // Stream completed
}
```

## 🎯 Event Flow

1. **User submits question** → `sendMessage(question)`
2. **Start event** → Stream begins, progress = 0%
3. **Progress events** → Stage updates, progress increments
4. **Concepts event** → Identified concepts displayed
5. **Prerequisites event** → Prerequisites shown
6. **Resources event** → Learning resources added
7. **Explanation chunks** → Text streams in real-time
8. **Complete event** → Final response assembled, progress = 100%

## 🔧 Configuration

### Environment Variables

Add to your `.env` file:

```bash
# API Base URL
VITE_API_URL=http://localhost:8080/api/v1

# For production
VITE_API_URL=https://your-domain.com/api/v1
```

### Custom Streaming Client

```typescript
import { StreamingQueryClient } from './services/streaming';

const customClient = new StreamingQueryClient('https://api.example.com/v1');

await customClient.streamQuery(
  { question: 'What is calculus?' },
  (event) => console.log('Event:', event),
  (error) => console.error('Error:', error),
  () => console.log('Complete!')
);
```

## 🎨 UI Customization

### Custom Progress Component

```tsx
import { StreamState } from '../types/streaming';

function CustomProgress({ streamState }: { streamState: StreamState }) {
  return (
    <div>
      <h3>{streamState.stage}</h3>
      <progress value={streamState.progress} max={100} />
      
      {streamState.concepts.length > 0 && (
        <div>
          <h4>Concepts:</h4>
          <ul>
            {streamState.concepts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
      
      {streamState.explanation && (
        <div>
          <h4>Explanation:</h4>
          <p>{streamState.explanation}</p>
        </div>
      )}
    </div>
  );
}
```

## 🔄 Migrate from Non-Streaming

### Before (using `useChat`)

```tsx
const { messages, input, setInput, isLoading, sendMessage } = useChat();
```

### After (using `useStreamingChat`)

```tsx
const {
  messages,
  input,
  setInput,
  isLoading,
  streamState,    // ← New: stream state
  sendMessage,
  cancelStream,   // ← New: cancel ability
  clearMessages,
} = useStreamingChat();
```

### Update Components

```tsx
// Before
<Chat
  messages={messages}
  input={input}
  isLoading={isLoading}
  onSubmit={handleSubmit}
  onNewQuestion={clearMessages}
/>

// After
<StreamingChat
  messages={messages}
  input={input}
  isLoading={isLoading}
  streamState={streamState}        // ← Add stream state
  onSubmit={handleSubmit}
  onNewQuestion={clearMessages}
  onCancelStream={cancelStream}    // ← Add cancel handler
/>
```

## 🐛 Troubleshooting

### Stream Not Working

1. **Check backend is running**: `curl http://localhost:8080/api/v1/health`
2. **Verify endpoint**: POST to `/api/v1/query/stream`
3. **Check CORS**: Backend must allow streaming headers
4. **Browser console**: Look for SSE connection errors

### No Progress Updates

- Ensure backend is sending events in SSE format: `data: {json}\n\n`
- Check Network tab → Look for `text/event-stream` content type
- Verify events are being parsed correctly

### Explanation Not Streaming

- Backend must send `explanation_chunk` events
- Check that chunks are being appended to state
- Verify LLM is streaming (not batched)

## 📈 Performance Tips

1. **Debounce rapid messages** - Prevent multiple simultaneous streams
2. **Cancel previous streams** - Call `cancelStream()` before new query
3. **Lazy load resources** - Only render visible items
4. **Memoize components** - Use `React.memo` for stream progress

## 🔒 Security Notes

- Always validate/sanitize streamed content
- Implement rate limiting on backend
- Use HTTPS in production
- Handle authentication tokens properly

## 📚 Related Files

- `/src/types/streaming.ts` - Type definitions
- `/src/services/streaming.ts` - Streaming client
- `/src/hooks/useStreamingChat.ts` - React hook
- `/src/components/StreamingChat.component.tsx` - Main component
- `/src/components/chat/StreamProgress.tsx` - Progress UI
- `/go-backend/docs/STREAMING_API_GUIDE.md` - Backend documentation

## 🎉 Next Steps

1. **Test the streaming** - Run `npm run dev` and try a question
2. **Customize UI** - Adjust colors, animations, layouts
3. **Add features** - Save streams, replay history, share results
4. **Monitor performance** - Track stream latency and completion rates

---

**Happy Streaming! 🚀**
