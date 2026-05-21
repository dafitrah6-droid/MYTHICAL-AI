import { Message, MemoryItem, Task, FileAttachment } from '../types';

export type StreamCallback = (partialText: string) => void;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const streamText = async (text: string, onChunk: StreamCallback) => {
  if (typeof onChunk !== 'function') return;

  const tokens = text.split(/(\s+)/);
  let buffer = '';

  for (const token of tokens) {
    buffer += token;
    onChunk(buffer);
    await delay(20);
  }
};

/**
 * Core Chat Processing with Memory and File Understanding (browser-safe)
 */
const postJson = async <T>(endpoint: string, payload: unknown): Promise<T | null> => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  if (onChunk) await streamText(resultText, onChunk);
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
