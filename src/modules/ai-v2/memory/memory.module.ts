import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemoryService } from './memory.service';
import { ChatSession, ChatSessionSchema } from './memory.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
    ]),
  ],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
