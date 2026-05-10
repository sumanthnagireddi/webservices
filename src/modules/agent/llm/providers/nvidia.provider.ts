import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider } from '../../domain/interfaces/llm-provider.interface';

@Injectable()
export class NvidiaProvider implements LlmProvider {
  readonly name = 'nvidia';

  private readonly llm: ChatOpenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey =
      this.config.get<string>('NVIDIA_API_KEY') ??
      this.config.get<string>('NVIDIA');

    this.llm = new ChatOpenAI({
      model: 'meta/llama-3.3-70b-instruct',
      apiKey,
      configuration: {
        baseURL: 'https://integrate.api.nvidia.com/v1',
      },
      temperature: 0.2,
      streaming: false,
    });
  }

  async generate(input: {
    systemPrompt?: string;
    userPrompt: string;
    context?: Record<string, unknown>;
  }): Promise<{ content: string }> {
    if (
      !this.config.get<string>('NVIDIA_API_KEY')?.trim() &&
      !this.config.get<string>('NVIDIA')?.trim()
    ) {
      throw new Error('NVIDIA_API_KEY is not configured');
    }

    const response = await this.llm.invoke([
      ...(input.systemPrompt ? [new SystemMessage(input.systemPrompt)] : []),
      new HumanMessage(input.userPrompt),
    ]);

    return {
      content: this.normalizeContent(response.content),
    };
  }

  private normalizeContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((block) =>
          typeof block === 'string'
            ? block
            : typeof block === 'object' && block !== null && 'text' in block
              ? String((block as { text?: string }).text ?? '')
              : '',
        )
        .join('');
    }

    throw new Error(
      `Unexpected content type from NVIDIA API: ${typeof content}`,
    );
  }
}
