import { Injectable } from '@nestjs/common';

// Policy engine decides whether a tool, model, or workflow action is allowed.
@Injectable()
export class PolicyEngineService {
  canRunTool(toolName: string): boolean {
    return toolName.length > 0;
  }
}
