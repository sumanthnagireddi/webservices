import { Injectable } from '@nestjs/common';

// Response builder shapes the final API payload returned to the client.
@Injectable()
export class ResponseBuilderService {
  build(sessionId: string, loopResult: { answer: string; iterations: number }) {
    return {
      sessionId,
      data: loopResult.answer,
      iterations: loopResult.iterations,
    };
  }
}
