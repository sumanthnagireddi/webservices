import { Module } from '@nestjs/common';
import { PolicyEngineService } from './policy-engine.service';

// Governance module is where permissions, tool policies, and approval gates
// should live as the agent gains more autonomy.
@Module({
  providers: [PolicyEngineService],
  exports: [PolicyEngineService],
})
export class AgentGovernanceModule {}
