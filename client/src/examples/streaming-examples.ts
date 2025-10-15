/**
 * Example: Streaming API Usage
 * 
 * This file demonstrates different ways to use the streaming API
 */

import { streamingClient, StreamingQueryClient } from '../services/streaming';
import type { StreamEvent } from '../types/streaming';

// ============================================================================
// Example 1: Basic Streaming Query
// ============================================================================

export async function basicStreamingExample() {
  console.log('=== Basic Streaming Example ===');

  await streamingClient.streamQuery(
    { 
      question: 'What are the prerequisites for calculus?' 
    },
    (event: StreamEvent) => {
      console.log(`[${event.type}]`, event.data);
    },
    (error) => {
      console.error('Stream error:', error);
    },
    () => {
      console.log('Stream completed!');
    }
  );
}

// ============================================================================
// Example 2: Handling Specific Events
// ============================================================================

export async function specificEventHandlingExample() {
  console.log('=== Specific Event Handling Example ===');

  let explanation = '';
  let concepts: string[] = [];
  let prerequisites: any[] = [];

  await streamingClient.streamQuery(
    { 
      question: 'Explain matrix multiplication',
      userId: 'user-123'
    },
    (event: StreamEvent) => {
      switch (event.type) {
        case 'start':
          console.log('Query started:', event.data.query_id);
          break;

        case 'progress':
          console.log(`Progress: ${event.data.percentage}% - ${event.data.message}`);
          break;

        case 'concepts':
          concepts = event.data.concepts;
          console.log('Concepts identified:', concepts);
          break;

        case 'prerequisites':
          prerequisites = event.data.prerequisites;
          console.log(`Found ${prerequisites.length} prerequisites`);
          break;

        case 'explanation_chunk':
          explanation += event.data.chunk;
          // Update UI with partial explanation
          updateExplanationUI(explanation);
          break;

        case 'explanation_complete':
          console.log('Full explanation ready:', event.data.full_explanation);
          break;

        case 'complete':
          console.log('Processing completed in:', event.data.processing_time);
          break;

        case 'error':
          console.error('Stream error:', event.data.message);
          break;
      }
    }
  );
}

// ============================================================================
// Example 3: Cancellable Stream
// ============================================================================

export async function cancellableStreamExample() {
  console.log('=== Cancellable Stream Example ===');

  const client = new StreamingQueryClient();

  // Start streaming
  const streamPromise = client.streamQuery(
    { question: 'What is linear algebra?' },
    (event) => console.log(event.type, event.data)
  );

  // Cancel after 3 seconds
  setTimeout(() => {
    console.log('Cancelling stream...');
    client.cancelStream();
  }, 3000);

  await streamPromise;
}

// ============================================================================
// Example 4: Multiple Sequential Streams
// ============================================================================

export async function sequentialStreamsExample() {
  console.log('=== Sequential Streams Example ===');

  const questions = [
    'What is a derivative?',
    'What are integrals?',
    'What is a limit?'
  ];

  for (const question of questions) {
    console.log(`\n--- Processing: ${question} ---`);
    
    await streamingClient.streamQuery(
      { question },
      (event) => {
        if (event.type === 'complete') {
          console.log('✓ Completed');
        }
      }
    );
  }
}

// ============================================================================
// Example 5: Stream with Error Handling and Retry
// ============================================================================

export async function streamWithRetryExample() {
  console.log('=== Stream with Retry Example ===');

  const maxRetries = 3;
  let attempt = 0;

  const tryStream = async (): Promise<void> => {
    attempt++;
    console.log(`Attempt ${attempt}/${maxRetries}`);

    try {
      await streamingClient.streamQuery(
        { question: 'Explain trigonometric functions' },
        (event) => {
          console.log(`[${event.type}]`, event.data);
        },
        (error) => {
          throw error; // Re-throw to catch below
        }
      );
      console.log('Success!');
    } catch (error) {
      console.error('Stream failed:', error);
      
      if (attempt < maxRetries) {
        console.log('Retrying in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return tryStream();
      } else {
        console.error('Max retries reached. Giving up.');
        throw error;
      }
    }
  };

  await tryStream();
}

// ============================================================================
// Example 6: Collecting All Stream Data
// ============================================================================

export async function collectStreamDataExample() {
  console.log('=== Collect Stream Data Example ===');

  interface StreamData {
    queryId: string | null;
    concepts: string[];
    prerequisites: any[];
    resources: any[];
    explanation: string;
    processingTime: number | null;
  }

  const data: StreamData = {
    queryId: null,
    concepts: [],
    prerequisites: [],
    resources: [],
    explanation: '',
    processingTime: null,
  };

  await streamingClient.streamQuery(
    { question: 'What is probability theory?' },
    (event) => {
      switch (event.type) {
        case 'start':
          data.queryId = event.query_id;
          break;
        case 'concepts':
          data.concepts = event.data.concepts;
          break;
        case 'prerequisites':
          data.prerequisites = event.data.prerequisites;
          break;
        case 'resources':
          data.resources = event.data.resources;
          break;
        case 'explanation_chunk':
          data.explanation += event.data.chunk;
          break;
        case 'complete':
          data.processingTime = event.data.processing_time;
          break;
      }
    }
  );

  console.log('Collected data:', data);
  return data;
}

// ============================================================================
// Example 7: React Component Integration
// ============================================================================

export const StreamingComponentExample = `
import React from 'react';
import { useStreamingChat } from '../hooks/useStreamingChat';
import StreamingChat from '../components/StreamingChat.component';

export default function MyStreamingPage() {
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
    <div style={{ height: '100vh' }}>
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
      
      {/* Optional: Show stream state */}
      <div style={{ position: 'fixed', bottom: 10, right: 10 }}>
        <pre>{JSON.stringify(streamState, null, 2)}</pre>
      </div>
    </div>
  );
}
`;

// ============================================================================
// Helper Functions
// ============================================================================

function updateExplanationUI(text: string) {
  // This would update your UI component
  console.log('Updating UI with explanation:', text.substring(0, 50) + '...');
}

// ============================================================================
// Run Examples
// ============================================================================

export async function runAllExamples() {
  console.log('\n🌊 Streaming API Examples\n');
  
  try {
    // Run examples one by one
    // await basicStreamingExample();
    // await specificEventHandlingExample();
    // await cancellableStreamExample();
    // await sequentialStreamsExample();
    // await streamWithRetryExample();
    // await collectStreamDataExample();
    
    console.log('\n✓ All examples completed!\n');
  } catch (error) {
    console.error('\n✗ Example failed:', error);
  }
}

// Usage in browser console:
// import { runAllExamples } from './examples/streaming-examples';
// runAllExamples();
