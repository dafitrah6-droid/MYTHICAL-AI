export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  base64Data?: string; // Added for data flow
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: FileAttachment[];
  tasks?: Task[]; // For task planning feature
  reasoning?: string; // For reasoning engine feature
}

export interface MemoryItem {
  id: string;
  category: string;
  content: string;
  createdAt: number;
}

export type AppView = 'dashboard' | 'chat' | 'memory' | 'settings';
