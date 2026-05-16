import { GoogleGenAI, Type } from '@google/genai';
import { Message, MemoryItem, Task, FileAttachment } from '../types';

// Initialize the SDK. Assumes process.env.API_KEY is available in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

/**
 * Core Chat Processing with Memory and File Understanding
 */
export const processChat = async (
  currentMessage: string,
  history: Message[],
  memories: MemoryItem[],
  files: FileAttachment[]
): Promise<string | null> => {
  // Parameter validation
  if (!currentMessage || typeof currentMessage !== 'string') return null;
  if (!Array.isArray(history)) return null;
  if (!Array.isArray(memories)) return null;
  if (!Array.isArray(files)) return null;

  // Construct system instruction from memories
  const memoryContext = memories.length > 0 
    ? `User Context/Memories:\n${memories.map(m => `- [${m.category}] ${m.content}`).join('\n')}`
    : 'No specific user context available.';

  const systemInstruction = `You are MYTHICAL AI, a premium, minimalist intelligence interface. 
Be concise, highly accurate, and maintain a sophisticated tone.
${memoryContext}`;

  // Prepare contents array
  const contents = [];

  // Add history (simplified for architecture flow)
  for (const msg of history.slice(-5)) { // Keep last 5 for context
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    });
  }

  // Prepare current message parts (text + files)
  const currentParts: any[] = [];
  
  // File understanding flow
  for (const file of files) {
    if (file.base64Data && file.type) {
      currentParts.push({
        inlineData: {
          data: file.base64Data,
          mimeType: file.type
        }
      });
    }
  }
  
  currentParts.push({ text: currentMessage });

  contents.push({
    role: 'user',
    parts: currentParts
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    }
  });

  return response.text;
};

/**
 * Conversation Memory Extraction Engine
 */
export const extractMemories = async (text: string): Promise<Omit<MemoryItem, 'id' | 'createdAt'>[] | null> => {
  // Parameter validation
  if (!text || typeof text !== 'string') return null;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze the following text and extract any persistent facts, preferences, or context about the user. If none exist, return an empty array.\n\nText: "${text}"`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'The category of the memory (e.g., Preference, Fact, Project Context)',
            },
            content: {
              type: Type.STRING,
              description: 'The extracted memory content.',
            },
          },
          required: ['category', 'content'],
        },
      },
    },
  });

  const jsonStr = response.text.trim();
  const extracted = JSON.parse(jsonStr);
  return extracted;
};

/**
 * Task Planning Engine
 */
export const generateTaskPlan = async (objective: string): Promise<Omit<Task, 'id' | 'status'>[] | null> => {
  // Parameter validation
  if (!objective || typeof objective !== 'string') return null;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Break down the following objective into a logical sequence of actionable tasks.\n\nObjective: "${objective}"`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'A short, clear title for the task.',
            },
            description: {
              type: Type.STRING,
              description: 'A detailed description of what needs to be done.',
            },
          },
          required: ['title', 'description'],
        },
      },
    },
  });

  const jsonStr = response.text.trim();
  const tasks = JSON.parse(jsonStr);
  return tasks;
};

/**
 * Reasoning Engine (Thinking process simulation)
 */
export const generateReasoning = async (query: string): Promise<string | null> => {
  // Parameter validation
  if (!query || typeof query !== 'string') return null;

  // Using thinkingConfig to simulate a reasoning engine flow
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      maxOutputTokens: 1000,
      thinkingConfig: { thinkingBudget: 500 },
    },
  });

  return response.text;
};
