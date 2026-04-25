// Domain shape for one message inside a session.
export interface AgentTurn {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: Date;
}
