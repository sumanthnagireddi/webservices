import { Module } from '@nestjs/common';
import { TraceService } from './trace.service';

// Observability module should publish traces, metrics, and logs for each agent
// turn and tool call.
@Module({
  providers: [TraceService],
  exports: [TraceService],
})
export class AgentObservabilityModule {}
