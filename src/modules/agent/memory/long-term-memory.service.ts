import { Injectable } from '@nestjs/common';

// Long-term memory should store durable facts like user profile, preferences,
// and extracted knowledge from previous sessions.
@Injectable()
export class LongTermMemoryService {
  async getProfile(userId: string): Promise<Record<string, unknown>> {
    return {
      userId,
    };
  }
}
