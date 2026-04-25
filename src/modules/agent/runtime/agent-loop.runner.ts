import { Injectable } from '@nestjs/common';
import { RouteNode } from './nodes/route.node';
import { PlanNode } from './nodes/plan.node';
import { RetrieveNode } from './nodes/retrieve.node';
import { ExecuteNode } from './nodes/execute.node';
import { ToolNode } from './nodes/tool.node';
import { CritiqueNode } from './nodes/critique.node';
import { FinalizeNode } from './nodes/finalize.node';

// Agent loop runner is the core orchestrator. Replace this simple sequence
// with LangGraph or a richer state machine when the flow becomes more complex.
@Injectable()
export class AgentLoopRunner {
  constructor(
    private readonly routeNode: RouteNode,
    private readonly planNode: PlanNode,
    private readonly retrieveNode: RetrieveNode,
    private readonly executeNode: ExecuteNode,
    private readonly toolNode: ToolNode,
    private readonly critiqueNode: CritiqueNode,
    private readonly finalizeNode: FinalizeNode,
  ) {}

  async run(context: Record<string, unknown>) {
    const routed = await this.routeNode.run(context);
    const plan = await this.planNode.run(routed);
    const retrieved = await this.retrieveNode.run(plan);
    const executed = await this.executeNode.run(retrieved);
    const tooled = await this.toolNode.run(executed);
    const critiqued = await this.critiqueNode.run(tooled);

    return this.finalizeNode.run(critiqued);
  }
}
