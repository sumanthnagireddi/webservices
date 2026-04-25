import { Module } from '@nestjs/common';
import { AgentApiModule } from './api/agent-api.module';
import { AgentApplicationModule } from './application/agent-application.module';
import { AgentRuntimeModule } from './runtime/agent-runtime.module';
import { AgentLlmModule } from './llm/agent-llm.module';
import { AgentToolsModule } from './tools/agent-tools.module';
import { AgentMemoryModule } from './memory/agent-memory.module';
import { AgentKnowledgeModule } from './knowledge/agent-knowledge.module';
import { AgentGovernanceModule } from './governance/agent-governance.module';
import { AgentObservabilityModule } from './observability/agent-observability.module';
import { AgentWorkflowsModule } from './workflows/agent-workflows.module';
import { AgentJobsModule } from './jobs/agent-jobs.module';
import { AgentDbModule } from './db/agent-db.module';

// Root module for the new agent platform. It groups the API, runtime,
// memory, tools, knowledge, governance, and observability layers.
@Module({
  imports: [
    AgentDbModule,
    AgentApiModule,
    AgentApplicationModule,
    AgentRuntimeModule,
    AgentLlmModule,
    AgentToolsModule,
    AgentMemoryModule,
    AgentKnowledgeModule,
    AgentGovernanceModule,
    AgentObservabilityModule,
    AgentWorkflowsModule,
    AgentJobsModule,
  ],
})
export class AgentPlatformModule {}
