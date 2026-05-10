import { Injectable } from '@nestjs/common';

// Finalize node should convert loop state into the final user-facing output.
@Injectable()
export class FinalizeNode {
  async run(state: Record<string, any>) {
    return {
      answer: state.execution?.draft ?? 'Agent finalizer placeholder response.',
      iterations: 1,
    };
  }
}
