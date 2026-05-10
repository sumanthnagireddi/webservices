// Contract for internal and external tools exposed to the agent loop.
export interface ToolDefinition {
  name: string;
  description: string;
  run(input: Record<string, unknown>): Promise<unknown>;
}
