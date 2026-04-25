import { Injectable } from '@nestjs/common';
import { LlmProvider } from '../domain/interfaces/llm-provider.interface';
import { NvidiaProvider } from './providers/nvidia.provider';
import { OllamaProvider } from './providers/ollama.provider';

// Provider factory chooses the active LLM backend without leaking that choice
// into the rest of the agent runtime.
@Injectable()
export class ProviderFactoryService {
  constructor(
    private readonly nvidiaProvider: NvidiaProvider,
    private readonly ollamaProvider: OllamaProvider,
  ) {}

  get(provider: 'nvidia' | 'ollama' = 'nvidia'): LlmProvider {
    return provider === 'ollama'
      ? this.ollamaProvider
      : this.nvidiaProvider;
  }
}
