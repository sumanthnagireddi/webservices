import { Injectable } from '@nestjs/common';
import { ToolDefinition } from '../domain/interfaces/tool.interface';

// Tool gateway is the safe wrapper around actual side effects, validation, and
// audit logging for tool execution.
@Injectable()
export class ToolGatewayService {
  async execute(tool: ToolDefinition, input: Record<string, unknown>) {
    return tool.run(input);
  }
}
