import { Module } from '@nestjs/common';
import { AgentLoopRunner } from './agent-loop.runner';
import { RouteNode } from './nodes/route.node';
import { PlanNode } from './nodes/plan.node';
import { RetrieveNode } from './nodes/retrieve.node';
import { ExecuteNode } from './nodes/execute.node';
import { ToolNode } from './nodes/tool.node';
import { CritiqueNode } from './nodes/critique.node';
import { FinalizeNode } from './nodes/finalize.node';
import { AgentLlmModule } from '../llm/agent-llm.module';

// Runtime module contains the agent loop and the graph-style nodes used by it.
@Module({
  imports: [AgentLlmModule],
  providers: [
    AgentLoopRunner,
    RouteNode,
    PlanNode,
    RetrieveNode,
    ExecuteNode,
    ToolNode,
    CritiqueNode,
    FinalizeNode,
  ],
  exports: [AgentLoopRunner],
})
export class AgentRuntimeModule {}
