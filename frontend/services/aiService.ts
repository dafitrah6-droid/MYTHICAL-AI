import { Message, MemoryItem, Task, FileAttachment } from '../types';

export type StreamCallback = (partialText: string) => void;

/**
 * Real-time streaming chat with Gemini, Claude, or GPT
 */
export const processStreamingChat = async (
  currentMessage: string,
  provider: 'gemini' | 'claude' | 'gpt' = 'gemini',
  onChunk?: StreamCallback
): Promise<string | null> => {
  try {
    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/ai/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: currentMessage, provider }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Streaming failed');
    }

    let fullResponse = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              fullResponse = data.fullResponse;
            } else if (data.chunk) {
              fullResponse += data.chunk;
              onChunk?.(data.chunk);
            } else if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            // Ignore JSON parse errors for incomplete frames
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  } catch (error: any) {
    console.error('Streaming error:', error);
    return null;
  }
};

/**
 * Core Chat Processing with Memory and File Understanding (browser-safe)
 */
const postJson = async <T>(endpoint: string, payload: unknown): Promise<T | null> => {
  try {
    // Get auth token from storage
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

export const processChat = async (
  currentMessage: string,
  history: Message[],
  memories: MemoryItem[],
  files: FileAttachment[],
  onChunk?: StreamCallback
): Promise<string | null> => {
  const fallbackResponse = `Mythical received your message: ${currentMessage}`;
  const resultText = await postJson<{ text: string }>('/api/ai/process', {
    currentMessage,
    history,
    memories,
    files,
  }).then((r) => r?.text ?? fallbackResponse).catch(() => fallbackResponse);

  if (onChunk) {
    // Simulate streaming for non-streaming response
    const tokens = resultText.split(/(\s+)/);
    let buffer = '';
    for (const token of tokens) {
      buffer += token;
      onChunk(buffer);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }

  return resultText;
};

/**
 * Conversation Memory Extraction Engine (delegates to backend)
 */
export const extractMemories = async (text: string): Promise<Omit<MemoryItem, 'id' | 'createdAt'>[] | null> => {
  if (!text || typeof text !== 'string') return null;
  const response = await postJson<Omit<MemoryItem, 'id' | 'createdAt'>[]>('/api/ai/memories', { text });
  return response ?? [];
};

/**
 * Task Planning Engine (delegates to backend)
 */
export const generateTaskPlan = async (objective: string): Promise<Omit<Task, 'id' | 'status'>[] | null> => {
  if (!objective || typeof objective !== 'string') return null;
  const response = await postJson<Omit<Task, 'id' | 'status'>[]>('/api/ai/plan', { objective });
  return (
    response ?? [
      { title: 'Review the objective', description: `Clarify the task goal and break it into smaller steps for: ${objective}` },
      { title: 'Create an execution plan', description: 'Define the next actions needed to make progress toward the expected outcome.' },
    ]
  );
};

/**
 * Reasoning Engine (delegates to backend)
 */
export const generateReasoning = async (query: string): Promise<string | null> => {
  if (!query || typeof query !== 'string') return null;
  const response = await postJson<{ text: string }>('/api/ai/reason', { query });
  return response?.text ?? `I am unable to access the remote reasoning service right now. Placeholder: ${query}`;
};
