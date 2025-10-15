/**
 * Streaming Query Client
 * 
 * Handles Server-Sent Events (SSE) streaming from the backend
 * for real-time progressive query responses.
 */

import type {
  StreamEvent,
  StreamEventHandler,
  StreamErrorHandler,
  StreamCompleteHandler,
} from '../types/streaming';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export interface StreamQueryOptions {
  question: string;
  userId?: string;
  context?: string;
}

export class StreamingQueryClient {
  private baseURL: string;
  private abortController: AbortController | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Stream a query and receive progressive updates
   */
  async streamQuery(
    options: StreamQueryOptions,
    onEvent: StreamEventHandler,
    onError?: StreamErrorHandler,
    onComplete?: StreamCompleteHandler
  ): Promise<void> {
    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${this.baseURL}/query/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: options.question,
          user_id: options.userId,
          context: options.context,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body available for streaming');
      }

      await this.processStream(response.body, onEvent, onError, onComplete);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Stream aborted by user');
          return;
        }
        onError?.(error);
      } else {
        onError?.(new Error('Unknown error occurred during streaming'));
      }
    }
  }

  /**
   * Process the SSE stream
   */
  private async processStream(
    body: ReadableStream<Uint8Array>,
    onEvent: StreamEventHandler,
    onError?: StreamErrorHandler,
    onComplete?: StreamCompleteHandler
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onComplete?.();
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = line.substring(6).trim();
              if (jsonData) {
                const event: StreamEvent = JSON.parse(jsonData);
                console.log('🔔 SSE Event received:', event.type, event.data);
                onEvent(event);

                // Auto-complete on error or complete event
                if (event.type === 'error' || event.type === 'complete') {
                  reader.releaseLock();
                  onComplete?.();
                  return;
                }
              }
            } catch (err) {
              console.error('Failed to parse SSE event:', err, 'Line:', line);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        onError?.(error);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Reader already released
      }
    }
  }

  /**
   * Cancel the current stream
   */
  cancelStream(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if a stream is currently active
   */
  isStreaming(): boolean {
    return this.abortController !== null;
  }
}

// Export singleton instance
export const streamingClient = new StreamingQueryClient();

// Export class for custom instances
export { StreamingQueryClient as default };
