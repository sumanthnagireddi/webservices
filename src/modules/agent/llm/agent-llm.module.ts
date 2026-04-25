import { Module } from '@nestjs/common';
import { NvidiaProvider } from './providers/nvidia.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { ProviderFactoryService } from './provider-factory.service';

// LLM module owns model providers and hides vendor-specific implementation.
@Module({
  providers: [NvidiaProvider, OllamaProvider, ProviderFactoryService],
  exports: [NvidiaProvider, OllamaProvider, ProviderFactoryService],
})
export class AgentLlmModule {}
