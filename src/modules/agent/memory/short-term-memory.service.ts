import { Injectable } from '@nestjs/common';
import { AgentTurn } from '../domain/entities/agent-turn.entity';

// Short-term memory should hold recent turns in Redis or another fast store.
@Injectable()
export class ShortTermMemoryService {
  private readonly sessions = new Map<string, AgentTurn[]>();

  async getRecentTurns(sessionId: string): Promise<AgentTurn[]> {
    return this.sessions.get(sessionId) ?? [];
  }

  async append(
    sessionId: string,
    role: AgentTurn['role'],
    content: string,
  ): Promise<void> {
    const turns = this.sessions.get(sessionId) ?? [];
    turns.push({ role, content, createdAt: new Date() });
    this.sessions.set(sessionId, turns);
  }
  async initializeSession(sessionId: string): Promise<void> {
    this.sessions.set(sessionId, []);
  }

  async clear(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}
