export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;  // null is valid for assistant tool_call messages
  tool_call_id?: string;
  tool_calls?: any[];
};