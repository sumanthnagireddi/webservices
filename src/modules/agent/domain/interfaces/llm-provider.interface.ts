// Contract implemented by every model backend. NVIDIA, Ollama, and vLLM
// should all satisfy this interface.
export interface LlmProvider {
  readonly name: string;
  generate(input: {
    systemPrompt?: string;
    userPrompt: string;
    context?: Record<string, unknown>;
  }): Promise<{ content: string }>;
}
