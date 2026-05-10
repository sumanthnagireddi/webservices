import { Module } from '@nestjs/common';
import { ChatWorkflow } from './chat.workflow';

// Workflows module should group task-specific flows like chat, finance,
// content generation, and research.
@Module({
  providers: [ChatWorkflow],
  exports: [ChatWorkflow],
})
export class AgentWorkflowsModule {}
