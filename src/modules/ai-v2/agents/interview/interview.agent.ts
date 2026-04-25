import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext, AgentResult } from '../agent.interface';
import { INTERVIEW_PROMPT } from './interview.agent.prompts';
import { AgenticLlmService,NVIDIA_MODELS } from '../agentic.llm.service';

interface InterviewQA {
  question: string;
  answer: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
  tags: string[];
}

@Injectable()
export class InterviewAgent implements IAgent {
  private readonly logger = new Logger(InterviewAgent.name);

  constructor(private readonly llmService: AgenticLlmService) {}

  async execute(ctx: AgentContext): Promise<AgentResult> {
    this.logger.log(`InterviewAgent: generating Q&A for "${ctx.args}"`);

    try {
      const qa = await this.llmService.askJson<InterviewQA>(
        ctx.args,
        NVIDIA_MODELS.DEEPSEEK, // strong reasoning for accurate technical Q&A
        INTERVIEW_PROMPT,
      );

      // TODO: const saved = await this.interviewBankService.create({ ...qa, userId: ctx.userId });

      return {
        success: true,
        message: `🎯 **Q:** ${qa.question}\n\n**A:** ${qa.answer}\n\n_Difficulty: ${qa.difficulty}_`,
        data: qa as unknown as Record<string, unknown>,
      };
    } catch {
      // LLM returned plain text instead of JSON — fall back gracefully
      const fallback = await this.llmService.ask(ctx.args, NVIDIA_MODELS.DEEPSEEK, INTERVIEW_PROMPT);
      return {
        success: true,
        message: fallback.data ?? 'Could not generate interview question.',
      };
    }
  }
}
