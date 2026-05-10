import { Injectable } from '@nestjs/common';
import { ShortTermMemoryService } from '../memory/short-term-memory.service';

// Memory extractor is where you will later summarize useful facts and store
// them into durable or semantic memory after each turn.
@Injectable()
export class MemoryExtractorService {
  constructor(private readonly shortTermMemory: ShortTermMemoryService) {}

  async capture(
    sessionId: string,
    userMessage: string,
    loopResult: { answer: string },
  ): Promise<void> {
    await this.shortTermMemory.append(sessionId, 'user', userMessage);
    await this.shortTermMemory.append(
      sessionId,
      'assistant',
      loopResult.answer,
    );
  }
}
