/**
 * useStreamingChat Hook
 * 
 * React hook for handling streaming chat with progressive updates
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { streamingClient } from '../services/streaming';
import type { Message } from '../types/api';
import type {
  StreamEvent,
  StreamState,
  ConceptsEventData,
  PrerequisitesEventData,
  ResourcesEventData,
  ExplanationChunkEventData,
  ExplanationCompleteEventData,
  ProgressEventData,
  CompleteEventData,
  ErrorEventData,
} from '../types/streaming';

const initialStreamState: StreamState = {
  isStreaming: false,
  queryId: null,
  progress: 0,
  stage: '',
  currentStep: 0,
  totalSteps: 5,
  concepts: [],
  prerequisites: [],
  contextChunks: [],
  resources: [],
  explanation: '',
  error: null,
  processingTime: null,
  completed: false,
};

export function useStreamingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streamState, setStreamState] = useState<StreamState>(initialStreamState);
  
  // Keep track of current streaming message
  const streamingMessageIdRef = useRef<number | null>(null);
  // Keep a ref to the latest streamState to avoid stale closures inside the
  // event handler (handleStreamEvent is memoized with empty deps).
  const streamStateRef = useRef<StreamState>(initialStreamState);

  useEffect(() => {
    streamStateRef.current = streamState;
  }, [streamState]);

  const resetStreamState = useCallback(() => {
    // Reset only the stream state. Do not clear the streamingMessageId here because
    // the placeholder bot message needs to remain addressable while the stream is active.
    setStreamState(initialStreamState);
  }, []);

  const handleStreamEvent = useCallback((event: StreamEvent) => {
    console.log('🎯 handleStreamEvent called:', event.type);
    
    switch (event.type) {
      case 'start':
        setStreamState(prev => ({
          ...prev,
          isStreaming: true,
          queryId: event.query_id,
          stage: 'Starting...',
          progress: 0,
        }));
        break;

      case 'progress': {
        const data = event.data as ProgressEventData;
        setStreamState(prev => ({
          ...prev,
          progress: data.percentage,
          stage: data.message,
          currentStep: data.current_step,
          totalSteps: data.total_steps,
        }));
        break;
      }

      case 'concepts': {
        const data = event.data as ConceptsEventData;
        setStreamState(prev => ({
          ...prev,
          concepts: data.concepts,
          stage: `Found ${data.count} concept${data.count !== 1 ? 's' : ''}`,
        }));
        break;
      }

      case 'prerequisites': {
        const data = event.data as PrerequisitesEventData;
        setStreamState(prev => ({
          ...prev,
          prerequisites: data.prerequisites,
          stage: `Retrieved ${data.count} prerequisite${data.count !== 1 ? 's' : ''}`,
        }));
        break;
      }

      case 'context': {
        const data = event.data as { chunks: string[]; count: number };
        setStreamState(prev => ({
          ...prev,
          contextChunks: data.chunks,
          stage: `Retrieved ${data.count} context chunk${data.count !== 1 ? 's' : ''}`,
        }));
        break;
      }

      case 'resources': {
        const data = event.data as ResourcesEventData;
        setStreamState(prev => ({
          ...prev,
          resources: data.resources,
          stage: `Found ${data.count} learning resource${data.count !== 1 ? 's' : ''}`,
        }));
        break;
      }

      case 'explanation_chunk': {
        const data = event.data as ExplanationChunkEventData;
        
        console.log('📄 Chunk received:', {
          chunkLength: data.chunk.length,
          chunkPreview: data.chunk.substring(0, 50),
        });
        
        // Update stream state
        setStreamState(prev => ({
          ...prev,
          explanation: prev.explanation + data.chunk,
          stage: 'Generating explanation...',
        }));

        // Update the bot message in real-time
        if (streamingMessageIdRef.current !== null) {
          setMessages(msgs => {
            console.log('🔍 Trying to update message:', {
              streamingMessageId: streamingMessageIdRef.current,
              totalMessages: msgs.length,
              messageIds: msgs.map(m => ({ id: m.id, role: m.role })),
            });
            
            return msgs.map(msg => {
              if (msg.id === streamingMessageIdRef.current) {
                const currentText = typeof msg.text === 'object' ? msg.text as any : {};
                const currentExplanation = currentText.explanation || '';
                const newExplanation = currentExplanation + data.chunk;
                
                console.log('💬 Updating message with chunk:', {
                  messageId: msg.id,
                  oldLength: currentExplanation.length,
                  chunkLength: data.chunk.length,
                  newLength: newExplanation.length,
                  preview: newExplanation.substring(0, 100),
                });
                
                return { 
                  ...msg, 
                  text: {
                    ...currentText,
                    explanation: newExplanation,
                    is_streaming: true,
                  }
                };
              }
              return msg;
            });
          });
        }
        break;
      }

      case 'explanation_complete': {
        const data = event.data as ExplanationCompleteEventData;
        console.log('📝 Explanation complete event:', {
          fullLength: data.full_explanation.length,
          preview: data.full_explanation.substring(0, 100),
        });
        
        setStreamState(prev => ({
          ...prev,
          explanation: data.full_explanation,
          stage: 'Explanation complete',
        }));
        
        // Update the bot message with the complete explanation
        if (streamingMessageIdRef.current !== null) {
          setMessages(msgs => 
            msgs.map(msg => {
              if (msg.id === streamingMessageIdRef.current) {
                const currentText = typeof msg.text === 'object' ? msg.text as any : {};
                console.log('💬 Updating message with full explanation:', {
                  messageId: msg.id,
                  currentExplanationLength: currentText.explanation?.length || 0,
                  newExplanationLength: data.full_explanation.length,
                });
                return { 
                  ...msg, 
                  text: {
                    ...currentText,
                    explanation: data.full_explanation,
                    is_streaming: false, // Explanation is complete, so not streaming anymore
                  }
                };
              }
              return msg;
            })
          );
          // Clear the streaming message id now that the explanation is final
          streamingMessageIdRef.current = null;
        }
        break;
      }

      case 'complete': {
        const data = event.data as CompleteEventData;
        setStreamState(prev => ({
          ...prev,
          isStreaming: false,
          completed: true,
          processingTime: data.processing_time,
          progress: 100,
          stage: 'Complete!',
        }));

        // Update final message with complete data and mark as not streaming
        if (streamingMessageIdRef.current !== null) {
          // Use the ref to read the latest stream state (avoid stale closure)
          const latest = streamStateRef.current;
          setMessages(msgs =>
            msgs.map(msg => {
              if (msg.id === streamingMessageIdRef.current) {
                const currentText = typeof msg.text === 'object' ? msg.text as any : {};
                return {
                  ...msg,
                  text: {
                    success: true,
                    query: currentText.query || '',
                    identified_concepts: latest.concepts,
                    learning_path: {
                      concepts: latest.prerequisites.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description || '',
                        type: 'prerequisite' as const,
                      })),
                      total_concepts: latest.prerequisites.length,
                    },
                    explanation: currentText.explanation || latest.explanation, // Use current or fallback
                    retrieved_context: latest.contextChunks,
                    processing_time: `${(data.processing_time / 1000000000).toFixed(2)}s`,
                    request_id: data.query_id,
                    timestamp: new Date().toISOString(),
                    is_streaming: false,
                  }
                };
              }
              return msg;
            })
          );
          // Clear the streaming message id since stream is complete
          streamingMessageIdRef.current = null;
        }
        break;
      }

      case 'error': {
        const data = event.data as ErrorEventData;
        setStreamState(prev => ({
          ...prev,
          isStreaming: false,
          error: data.message,
          stage: 'Error occurred',
        }));

        // Update message with error
        if (streamingMessageIdRef.current !== null) {
          setMessages(msgs =>
            msgs.map(msg =>
              msg.id === streamingMessageIdRef.current
                ? {
                    ...msg,
                    text: {
                      success: false,
                      error: data.message,
                      request_id: event.query_id,
                      timestamp: new Date().toISOString(),
                      query: (msg.text as any).query || '',
                      identified_concepts: [],
                      learning_path: { concepts: [], total_concepts: 0 },
                      explanation: '',
                      retrieved_context: [],
                      processing_time: '0s',
                    }
                  }
                : msg
            )
          );
          // Clear streaming id on error
          streamingMessageIdRef.current = null;
        }
        break;
      }
    }
  }, []); // Remove dependencies to prevent stale closures during rapid updates

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    // Reset prior stream state (keep streamingMessageIdRef untouched until we set it)
    resetStreamState();

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      text: messageText,
      role: 'user',
    };
    setMessages(msgs => [...msgs, userMessage]);
    setInput('');

    // Create placeholder bot message
    const botMessageId = Date.now() + 1;
    streamingMessageIdRef.current = botMessageId;
    
    const botMessage: Message = {
      id: botMessageId,
      text: {
        success: true,
        query: messageText,
        identified_concepts: [],
        learning_path: { concepts: [], total_concepts: 0 },
        explanation: '',
        retrieved_context: [],
        processing_time: '0s',
        request_id: '',
        timestamp: new Date().toISOString(),
        is_streaming: true,
      },
      role: 'bot',
    };
    setMessages(msgs => [...msgs, botMessage]);

  // Note: Do not reset stream state here again; it's already been reset above.

    // Start streaming
    try {
      await streamingClient.streamQuery(
        { question: messageText },
        handleStreamEvent,
        (error) => {
          console.error('Streaming error:', error);
          setStreamState(prev => ({
            ...prev,
            isStreaming: false,
            error: error.message,
          }));

          // Update message with error
          setMessages(msgs =>
            msgs.map(msg =>
              msg.id === botMessageId
                ? {
                    ...msg,
                    text: {
                      success: false,
                      error: error.message,
                      request_id: '',
                      timestamp: new Date().toISOString(),
                      query: messageText,
                      identified_concepts: [],
                      learning_path: { concepts: [], total_concepts: 0 },
                      explanation: 'An error occurred while processing your question.',
                      retrieved_context: [],
                      processing_time: '0s',
                    }
                  }
                : msg
            )
          );
        },
        () => {
          console.log('Stream completed');
          setStreamState(prev => ({ ...prev, isStreaming: false, completed: true }));
        }
      );
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  }, []); // Remove handleStreamEvent dependency to prevent stale closures

  const cancelStream = useCallback(() => {
    streamingClient.cancelStream();
    // Explicitly clear the streaming message id and reset stream state
    streamingMessageIdRef.current = null;
    resetStreamState();
  }, [resetStreamState]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setInput('');
    streamingMessageIdRef.current = null;
    resetStreamState();
  }, [resetStreamState]);

  return {
    messages,
    input,
    setInput,
    isLoading: streamState.isStreaming,
    streamState,
    sendMessage,
    cancelStream,
    clearMessages,
  };
}
