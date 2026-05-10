import { Module } from '@nestjs/common';
import { ProviderFactoryService } from './provider-factory.service';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { NvidiaProvider } from './providers/nvidia.provider';

// LLM module owns model providers and hides vendor-specific implementation.
@Module({
  providers: [
    OpenAiProvider,
    NvidiaProvider,
    OllamaProvider,
    ProviderFactoryService,
  ],
  exports: [
    OpenAiProvider,
    NvidiaProvider,
    OllamaProvider,
    ProviderFactoryService,
  ],
})
export class AgentLlmModule {}
