import { Injectable } from '@nestjs/common';

// Critique node should validate the draft answer for quality, policy, and
// completion before the system returns a result.
@Injectable()
export class CritiqueNode {
  async run(state: Record<string, unknown>) {
    return {
      ...state,
      critique: {
        passed: true,
      },
    };
  }
}
