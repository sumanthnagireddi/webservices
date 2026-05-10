import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext, AgentResult } from '../agent.interface';
import { BLOG_POST_PROMPT } from './blog.agent.prompts';
import { AgenticLlmService } from '../agentic.llm.service';

@Injectable()
export class BlogAgent implements IAgent {
  private readonly llmService: AgenticLlmService; // Assume this is injected properly
  private readonly logger = new Logger(BlogAgent.name);

  async execute(ctx: AgentContext): Promise<AgentResult> {
    this.logger.log(`BlogAgent: drafting post for "${ctx.args}"`);

    // const raw = await this.llmService.askJson({ system: BLOG_POST_PROMPT, user: ctx.args });
    // const saved = await this.blogService.createFromAI({ content: raw, userId: ctx.userId });

    return {
      success: true,
      message: `📰 Blog post draft created: **${ctx.args}**\n_(wire BlogService.createFromAI())_`,
      data: { title: ctx.args },
    };
  }
}
