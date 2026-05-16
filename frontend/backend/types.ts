export type UserRole = 'admin' | 'premium_user' | 'standard_user';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
}

export interface DbSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface DbConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning: string | null;
  created_at: Date;
}

export interface DbFile {
  id: string;
  message_id: string | null;
  user_id: string;
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
  created_at: Date;
}

export interface DbMemory {
  id: string;
  user_id: string;
  category: string;
  content: string;
  is_encrypted: boolean;
  created_at: Date;
}

export interface DbDocument {
  id: string;
  user_id: string;
  filename: string;
  mime_type: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: Date;
}

export interface DbDocumentChunk {
  id: string;
  document_id: string;
  content: string;
  embedding: number[];
  chunk_index: number;
}

export interface SearchResult {
  content: string;
  filename: string;
  similarity: number;
}

// --- Tool & Security System Types ---

export type ToolPermission = 
  | 'web_search' 
  | 'execute_code' 
  | 'analyze_files' 
  | 'api_network' 
  | 'schedule_tasks'
  | 'system_admin';

export interface SecurityContext {
  userId: string;
  role: UserRole;
  permissions: ToolPermission[];
  ipAddress: string;
  userAgent: string;
}

export interface ToolContext extends SecurityContext {
  conversationId?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  fallbackTriggered?: boolean;
}

export interface SecurityLog {
  id: string;
  user_id?: string;
  event_type: 'auth_failure' | 'rate_limit' | 'prompt_injection' | 'unauthorized_access' | 'malicious_payload';
  description: string;
  ip_address: string;
  created_at: Date;
}

// --- Agent Orchestration Types ---

export type AgentRole = 'planner' | 'reasoner' | 'executor' | 'critic' | 'memory_manager';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';

export interface AgentTask {
  id: string;
  description: string;
  dependencies: string[];
  status: TaskStatus;
  result?: string;
  confidenceScore?: number;
  error?: string;
  retryCount: number;
}

export interface ReflectionResult {
  passed: boolean;
  confidenceScore: number;
  feedback: string;
}

export interface OrchestrationContext extends ToolContext {
  objective: string;
  maxDepth: number;
  currentDepth: number;
  globalContext: Record<string, any>;
}
