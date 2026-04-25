import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { LlmProvider } from '../../domain/interfaces/llm-provider.interface';

@Injectable()
export class NvidiaProvider implements LlmProvider {
  readonly name = 'nvidia';

  private readonly llm: ChatOpenAI;

  constructor(private readonly config: ConfigService) {
    this.llm = new ChatOpenAI({
      model: 'meta/llama-3.3-70b-instruct',
      apiKey: this.config.get<string>('NVIDIA'),
      configuration: {
        baseURL: 'https://integrate.api.nvidia.com/v1',
      },
      temperature: 0.2,
      streaming: false,
    });
  }

  async generate(input: { systemPrompt?: string; userPrompt: string; context?: Record<string, unknown> }): Promise<{ content: string }> {
    const content = await this.callNvidiaApi(input.systemPrompt, input.userPrompt);
    return { content };
  }

  private async callNvidiaApi(systemPrompt: string | undefined,userPrompt: string): Promise<string> {
    const messages = [
      ...(systemPrompt ? [new SystemMessage(systemPrompt)] : []),
      new HumanMessage(userPrompt),
    ];

    const response = await this.llm.invoke(messages);

    const content = response.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((block) => (typeof block === 'string' ? block : (block as any).text ?? ''))
        .join('');
    }

    throw new Error(`Unexpected content type from NVIDIA API: ${typeof content}`);
  }
}