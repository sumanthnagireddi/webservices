import { Injectable } from '@nestjs/common';
import { AgentSession } from '../domain/entities/agent-session.entity';
import { RetrieverService } from '../knowledge/retriever.service';

// Context builder decides which memory, retrieval results, and policies should
// be included in the prompt before the loop starts.
@Injectable()
export class ContextBuilderService {
  constructor(private readonly retriever: RetrieverService) {}

  async build(session: AgentSession, message: string) {
    const knowledge = await this.retriever.retrieve(message);
    return {
      session,
      message,
      knowledge,
    };
  }
}
