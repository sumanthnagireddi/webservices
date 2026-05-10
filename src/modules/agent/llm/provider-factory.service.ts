import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider } from '../domain/interfaces/llm-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { NvidiaProvider } from './providers/nvidia.provider';
import { OllamaProvider } from './providers/ollama.provider';

// Provider factory chooses the active LLM backend without leaking that choice
// into the rest of the agent runtime.
export type AgentProviderName = 'auto' | 'openai' | 'nvidia' | 'ollama';

@Injectable()
export class ProviderFactoryService {
  private readonly logger = new Logger(ProviderFactoryService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly openAiProvider: OpenAiProvider,
    private readonly nvidiaProvider: NvidiaProvider,
    private readonly ollamaProvider: OllamaProvider,
  ) {}

  get(provider: AgentProviderName = 'auto'): LlmProvider {
    const resolved =
      provider === 'auto' ? this.resolveDefaultProvider() : provider;

    if (resolved === 'openai') {
      return this.openAiProvider;
    }

    if (resolved === 'nvidia') {
      return this.nvidiaProvider;
    }

    return this.ollamaProvider;
  }

  private resolveDefaultProvider(): Exclude<AgentProviderName, 'auto'> {
    const configured = this.config
      .get<string>('AGENT_LLM_PROVIDER')
      ?.trim()
      .toLowerCase();

    if (
      configured === 'openai' ||
      configured === 'nvidia' ||
      configured === 'ollama'
    ) {
      return configured;
    }

    if (this.hasValue('OPENAI_API_KEY')) {
      return 'openai';
    }

    if (this.hasValue('NVIDIA_API_KEY') || this.hasValue('NVIDIA')) {
      return 'nvidia';
    }

    this.logger.warn(
      'No OpenAI or NVIDIA credentials found for the agent. Falling back to ollama.',
    );

    return 'ollama';
  }

  private hasValue(key: string): boolean {
    return Boolean(this.config.get<string>(key)?.trim());
  }
}
