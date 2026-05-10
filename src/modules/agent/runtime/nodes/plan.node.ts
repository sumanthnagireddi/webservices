import { Injectable } from '@nestjs/common';

// Plan node should transform the request into a short executable plan.
@Injectable()
export class PlanNode {
  async run(state: Record<string, unknown>) {
    return {
      ...state,
      plan: ['understand request', 'answer or call tool'],
    };
  }
}
