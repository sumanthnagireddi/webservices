import { Module } from '@nestjs/common';
import { AgentJobService } from './agent-job.service';

// Jobs module is the future home for long-running and resumable agent work.
@Module({
  providers: [AgentJobService],
  exports: [AgentJobService],
})
export class AgentJobsModule {}
