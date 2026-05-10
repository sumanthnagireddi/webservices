import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider } from '../../domain/interfaces/llm-provider.interface';

@Injectable()
export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';

  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly fallbackModel = 'gpt-4o-mini';
  private readonly preferredModel: string;
  private readonly baseURL?: string;

  constructor(private readonly config: ConfigService) {
    this.preferredModel =
      this.config.get<string>('OPENAI_MODEL')?.trim() || this.fallbackModel;
    this.baseURL = this.config.get<string>('OPENAI_BASE_URL')?.trim();
  }

  async generate(input: {
    systemPrompt?: string;
    userPrompt: string;
    context?: Record<string, unknown>;
  }): Promise<{ content: string }> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const messages = [
      ...(input.systemPrompt ? [new SystemMessage(input.systemPrompt)] : []),
      new HumanMessage(input.userPrompt),
    ];

    try {
      const response = await this.createClient(
        this.preferredModel,
        apiKey,
      ).invoke(messages);

      return {
        content: this.normalizeContent(response.content),
      };
    } catch (error) {
      if (!this.shouldRetryWithFallback(error)) {
        throw error;
      }

      this.logger.warn(
        `OPENAI_MODEL "${this.preferredModel}" is unavailable. Retrying with ${this.fallbackModel}.`,
      );

      const response = await this.createClient(
        this.fallbackModel,
        apiKey,
      ).invoke(messages);

      return {
        content: this.normalizeContent(response.content),
      };
    }
  }

  private createClient(model: string, apiKey: string): ChatOpenAI {
    return new ChatOpenAI({
      model,
      apiKey,
      configuration: this.baseURL ? { baseURL: this.baseURL } : undefined,
      temperature: 0.2,
      streaming: false,
    });
  }

  private shouldRetryWithFallback(error: unknown): boolean {
    if (this.preferredModel === this.fallbackModel) {
      return false;
    }

    const message = error instanceof Error ? error.message : String(error);

    return /MODEL_NOT_FOUND|does not exist|do not have access/i.test(message);
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

    throw new Error(`Unexpected content type from OpenAI: ${typeof content}`);
  }
}
