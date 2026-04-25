import { AgentTurn } from './agent-turn.entity';

// Domain shape for a live session. Keep this simple and free from Nest or DB
// concerns so it remains reusable across modules and workers.
export interface AgentSession {
  sessionId: string;
  userId: string;
  turns: AgentTurn[];
  profile: Record<string, unknown>;
}
