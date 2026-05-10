import { Injectable, Logger } from '@nestjs/common';
import { ProviderFactoryService } from '../llm/provider-factory.service';
import { agentTitlePrompt } from '../prompts/title-generation.prompt';

/**
 * TitleGeneratorService generates concise session titles from user messages.
 * Uses the active LLM provider to generate a 5-word max title.
 */
@Injectable()
export class TitleGeneratorService {
  private readonly logger = new Logger(TitleGeneratorService.name);

  constructor(private readonly providerFactory: ProviderFactoryService) {}

  /**
   * Generate a concise session title from the first user message.
   *
   * @param firstMessage - The user's initial message
   * @returns A concise title (typically 5 words or less)
   */
  async generateTitle(firstMessage: string): Promise<string> {
    try {
      const provider = this.providerFactory.get();
      const prompt = agentTitlePrompt(firstMessage);
      const result = await provider.generate({ userPrompt: prompt });
      const title = result.content
        .trim()
        .replace(/^["']|["']$/g, '')
        .split('\n')[0];

      this.logger.debug(
        `Generated title for "${firstMessage.slice(0, 30)}..." -> "${title}"`,
      );

      return title || `Session: ${firstMessage.slice(0, 20)}...`;
    } catch (err) {
      this.logger.error('Failed to generate title, using fallback', err);
      return `Session: ${firstMessage.slice(0, 20)}...`;
    }
  }
}
