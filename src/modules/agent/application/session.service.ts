import { Injectable } from '@nestjs/common';
import { ShortTermMemoryService } from '../memory/short-term-memory.service';
import { LongTermMemoryService } from '../memory/long-term-memory.service';
import { AgentSession } from '../domain/entities/agent-session.entity';
import { v4 as uuidv4 } from 'uuid';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AgentSession as AgentSessionModel,
  AgentSessionDocument,
} from '../db/agent_session.schema';
// Session service centralizes how the agent loads and clears conversation state.
@Injectable()
export class SessionService {
  constructor(
    private readonly shortTermMemory: ShortTermMemoryService,
    private readonly longTermMemory: LongTermMemoryService,
    @InjectModel(AgentSessionModel.name)
    private readonly agentSessionModel: Model<AgentSessionDocument>,
  ) {}

  async load(sessionId: string, userId = 'anonymous'): Promise<AgentSession> {
    const turns = await this.shortTermMemory.getRecentTurns(sessionId);
    const profile = await this.longTermMemory.getProfile(userId);

    return {
      sessionId,
      userId,
      turns,
      profile,
    };
  }

  async create( userId:string ,title:string): Promise<AgentSession> {
    const sessionId = uuidv4();
    await this.shortTermMemory.initializeSession(sessionId);
    const profile = await this.longTermMemory.getProfile(userId);
    const agentSession = await this.agentSessionModel.create({ userId,sessionId,title });
    return {
      sessionId: agentSession.sessionId,
      userId,
      turns: [],
      profile,
    };
  }

  async reset(sessionId: string): Promise<void> {
    await this.shortTermMemory.clear(sessionId);
  }
}
