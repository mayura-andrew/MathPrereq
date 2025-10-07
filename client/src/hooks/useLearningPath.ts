import { useMemo } from 'react';
import type { Message, QueryResponse } from '../types/api';

export function useLearningPath(messages: Message[]) {
  const learningPathData = useMemo(() => {
    const lastBot = [...messages].reverse().find(m => m.role === 'bot');
    return lastBot ? ((lastBot.text as QueryResponse)?.learning_path) : null;
  }, [messages]);

  return {
    learningPathData,
  };
}