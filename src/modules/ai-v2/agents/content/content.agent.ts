import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext, AgentResult } from '../agent.interface';
import { CONTENT_GENERATION_PROMPT } from './content.agent.prompts';
import { AgenticLlmService } from '../agentic.llm.service';
import { ContentService } from 'src/modules/content/content.service';

@Injectable()
export class ContentAgent implements IAgent {
  private readonly logger = new Logger(ContentAgent.name);
  constructor(
    private readonly llmService: AgenticLlmService, // Assume this is injected properly
  ) {}
  async execute(ctx: AgentContext): Promise<AgentResult> {
    this.logger.log(`ContentAgent: generating content for "${ctx.args}"`);

    // const raw = await this.llmService.chat({ system: CONTENT_GENERATION_PROMPT, user: ctx.args });
    // const saved = await this.contentService.createFromAI({ body: raw, userId: ctx.userId });

    return {
      success: true,
      message: `📝 Content draft generated for: **${ctx.args}**\n_(wire LlmService to get real output)_`,
      data: { prompt: ctx.args },
    };
  }
}
