import { Module } from '@nestjs/common';
import { ShortTermMemoryService } from './short-term-memory.service';
import { LongTermMemoryService } from './long-term-memory.service';

// Memory module separates fast conversational state from durable user memory.
@Module({
  providers: [ShortTermMemoryService, LongTermMemoryService],
  exports: [ShortTermMemoryService, LongTermMemoryService],
})
export class AgentMemoryModule {}
