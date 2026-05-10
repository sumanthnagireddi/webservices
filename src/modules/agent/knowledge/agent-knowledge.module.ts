import { Module } from '@nestjs/common';
import { RetrieverService } from './retriever.service';

// Knowledge module owns retrieval, embeddings, and document-based context.
@Module({
  providers: [RetrieverService],
  exports: [RetrieverService],
})
export class AgentKnowledgeModule {}
