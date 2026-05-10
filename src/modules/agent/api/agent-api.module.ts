import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentApplicationModule } from '../application/agent-application.module';

// HTTP entrypoint for the agent system. Add REST and streaming endpoints here.
@Module({
  imports: [AgentApplicationModule],
  controllers: [AgentController],
})
export class AgentApiModule {}
