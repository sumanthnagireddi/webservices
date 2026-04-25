import { Injectable } from '@nestjs/common';

// Agent job service should enqueue and resume background tasks once you move
// beyond short request-response agent flows.
@Injectable()
export class AgentJobService {
  async enqueue(payload: Record<string, unknown>) {
    return {
      queued: true,
      payload,
    };
  }
}
