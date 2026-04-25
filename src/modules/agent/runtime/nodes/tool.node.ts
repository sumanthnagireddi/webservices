import { Injectable } from '@nestjs/common';

// Tool node should execute any approved tool calls and feed their results back
// into the loop state.
@Injectable()
export class ToolNode {
  async run(state: Record<string, unknown>) {
    return {
      ...state,
      toolResults: [],
    };
  }
}
