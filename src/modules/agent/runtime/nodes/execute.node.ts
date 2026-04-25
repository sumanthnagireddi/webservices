import { Injectable } from '@nestjs/common';

// Execute node should call the model and decide whether the next action is a
// final answer or a tool request.
@Injectable()
export class ExecuteNode {
  async run(state: Record<string, unknown>) {
    return {
      ...state,
      execution: {
        decision: 'answer',
        draft: 'Agent execution placeholder response.',
      },
    };
  }
}
