import { Injectable } from '@nestjs/common';

// Retrieve node should pull relevant memory and knowledge before execution.
@Injectable()
export class RetrieveNode {
  async run(state: Record<string, unknown>) {
    return {
      ...state,
      retrieved: true,
    };
  }
}
