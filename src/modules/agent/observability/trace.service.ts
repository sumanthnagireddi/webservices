import { Injectable, Logger } from '@nestjs/common';

// Trace service is the seam where Langfuse, OpenTelemetry, or custom tracing
// can be plugged in without touching business logic.
@Injectable()
export class TraceService {
  private readonly logger = new Logger(TraceService.name);

  trace(event: string, payload: Record<string, unknown> = {}) {
    this.logger.debug({ event, payload });
  }
}
