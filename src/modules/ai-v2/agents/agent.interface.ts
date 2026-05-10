import { ShortcutValue } from '../chatbot/shortcut.constants';

// ── Payload flowing into an agent ──────────────────────────────────────────
export interface AgentContext {
  command: ShortcutValue;
  args: string;
  sessionId: string;
  userId: string;
}

// ── What every agent must return ───────────────────────────────────────────
export interface AgentResult {
  success: boolean;
  message: string;          // human-readable reply for the chatbot
  data?: Record<string, unknown>; // optional structured output (saved entity, etc.)
}

// ── Contract every specialized agent must implement ────────────────────────
export interface IAgent {
  execute(context: AgentContext): Promise<AgentResult>;
}