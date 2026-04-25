import { Injectable } from '@nestjs/common';
import { LlmProvider } from '../../domain/interfaces/llm-provider.interface';

// Ollama provider gives you a fully local fallback for zero-cost inference.
@Injectable()
export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';

  async generate(input: {
    systemPrompt?: string;
    userPrompt: string;
    context?: Record<string, unknown>;
  }): Promise<{ content: string }> {
    return {
      content: `Ollama provider placeholder for: ${input.userPrompt}`,
    };
  }
}
