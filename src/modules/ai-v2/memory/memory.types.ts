export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  updatedAt: Date;
}
