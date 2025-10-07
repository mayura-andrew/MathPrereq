import { useState } from 'react';
import type { Message, QueryResponse } from '../types/api';
import { mathAPI } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = { id: Date.now(), text: messageText, role: 'user' };
    setMessages(m => [...m, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await mathAPI.processQuery(messageText.trim());
      const botMessage: Message = {
        id: Date.now() + 1,
        text: response,
        role: 'bot'
      };
      setMessages(m => [...m, botMessage]);
    } catch (error) {
      console.error('API Error:', error);

      // Fallback to mock response on error
      const mockResponse: QueryResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        request_id: 'fallback-' + Date.now(),
        timestamp: new Date().toISOString(),
        query: messageText,
        identified_concepts: [],
        learning_path: {
          concepts: [],
          total_concepts: 0,
        },
        explanation: 'Sorry, there was an error processing your question. Please try again.',
        retrieved_context: [],
        processing_time: '0.00s',
      };

      const botMessage: Message = {
        id: Date.now() + 1,
        text: mockResponse,
        role: 'bot'
      };

      setMessages(m => [...m, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setInput('');
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    clearMessages,
  };
}