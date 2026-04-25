import { Injectable, Logger } from '@nestjs/common';
import { SHORTCUTS } from '../chatbot/shortcut.constants';
import { AgentContext, AgentResult } from './agent.interface';
import { ChatMessage } from '../memory/memory.types';

// Agent imports (add each as you build them)
import { ContentAgent } from './content/content.agent';
import { BlogAgent } from './blog/blog.agent';
import { InterviewAgent } from './interview/interview.agent';
import { FinanceAgent } from './finance/finance.agent';
import { RagAgent } from './rag/rag.agent';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  // Dispatch table — maps shortcut → agent
  private readonly dispatch_table: Record<string, (ctx: AgentContext) => Promise<AgentResult>>;

  constructor(
    private readonly contentAgent: ContentAgent,
    private readonly blogAgent: BlogAgent,
    private readonly interviewAgent: InterviewAgent,
    private readonly financeAgent: FinanceAgent,
    private readonly ragAgent: RagAgent,
  ) {
    this.dispatch_table = {
      [SHORTCUTS.GENERATE]: (ctx) => this.contentAgent.execute(ctx),
      [SHORTCUTS.BLOG]:     (ctx) => this.blogAgent.execute(ctx),
      [SHORTCUTS.INTERVIEW]:(ctx) => this.interviewAgent.execute(ctx),
      [SHORTCUTS.EXPENSE]:  (ctx) => this.financeAgent.execute(ctx),
      [SHORTCUTS.ASK]:      (ctx) => this.ragAgent.execute(ctx),
    };
  }

  async dispatch(ctx: AgentContext): Promise<AgentResult> {
    const handler = this.dispatch_table[ctx.command];
    if (!handler) {
      return { success: false, message: `Unknown command: ${ctx.command}` };
    }

    try {
      this.logger.log(`Dispatching ${ctx.command} → agent`);
      return await handler(ctx);
    } catch (err) {
      this.logger.error(`Agent error for ${ctx.command}`, err);
      return { success: false, message: 'Agent failed. Please try again.' };
    }
  }

  /** Plain conversational turn — no shortcut, just history + new message */
  async chat(history: ChatMessage[], userMessage: string): Promise<string> {
    // Delegate to RAG agent's fallback conversation method
    
    return this.ragAgent.converse(history, userMessage);
  }
}
