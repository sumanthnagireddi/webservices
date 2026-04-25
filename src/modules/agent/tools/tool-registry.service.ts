import { Injectable } from '@nestjs/common';
import { ToolDefinition } from '../domain/interfaces/tool.interface';

// Tool registry is the catalog the agent runtime should query before exposing
// tools to a model.
@Injectable()
export class ToolRegistryService {
  getAll(): ToolDefinition[] {
    return [];
  }
}
