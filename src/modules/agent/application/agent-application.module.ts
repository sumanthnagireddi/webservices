import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { SessionService } from './session.service';
import { ContextBuilderService } from './context-builder.service';
import { ResponseBuilderService } from './response-builder.service';
import { MemoryExtractorService } from './memory-extractor.service';
import { AgentRuntimeModule } from '../runtime/agent-runtime.module';
import { AgentMemoryModule } from '../memory/agent-memory.module';
import { AgentKnowledgeModule } from '../knowledge/agent-knowledge.module';
import { AgentObservabilityModule } from '../observability/agent-observability.module';
import { AgentGovernanceModule } from '../governance/agent-governance.module';
import { ConversationsService } from './conversations.service';
import { AgentDbModule } from '../db/agent-db.module';
import { AgentLlmModule } from '../llm/agent-llm.module';
import { TitleGeneratorService } from './title-generator.service';

// Application layer for coordinating a full agent request from input to output.
@Module({
  imports: [
    AgentDbModule,
    AgentLlmModule,
    AgentRuntimeModule,
    AgentMemoryModule,
    AgentKnowledgeModule,
    AgentObservabilityModule,
    AgentGovernanceModule,
  ],
  providers: [
    AgentService,
    SessionService,
    ContextBuilderService,
    ResponseBuilderService,
    MemoryExtractorService,
    ConversationsService,
    TitleGeneratorService,
  ],
  exports: [AgentService, ConversationsService],
})
export class AgentApplicationModule {}
