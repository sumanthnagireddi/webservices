import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext, AgentResult } from '../agent.interface';
import { FINANCE_EXTRACTION_PROMPT } from './finance.agent.prompts';
import { AgenticLlmService ,NVIDIA_MODELS} from '../agentic.llm.service';

interface ExtractedExpense {
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
}

@Injectable()
export class FinanceAgent implements IAgent {
  private readonly logger = new Logger(FinanceAgent.name);

  constructor(private readonly llmService: AgenticLlmService) {}

  async execute(ctx: AgentContext): Promise<AgentResult> {
    this.logger.log(`FinanceAgent: extracting expense from "${ctx.args}"`);

    try {
      // askJson() handles JSON parsing + fence stripping automatically
      const expense = await this.llmService.askJson<ExtractedExpense>(
        ctx.args,
        NVIDIA_MODELS.NEMOTRON, // best for structured/tool-style extraction
        FINANCE_EXTRACTION_PROMPT,
      );

      // TODO: const saved = await this.financeService.createExpense({ ...expense, userId: ctx.userId });

      return {
        success: true,
        message: `✅ Expense logged: **${expense.description}** — ${expense.currency ?? '$'}${expense.amount} (${expense.category})`,
        data: expense as unknown as Record<string, unknown>,
      };
    } catch (err) {
      this.logger.error('FinanceAgent failed', err);
      return {
        success: false,
        message: 'Could not parse the expense. Try: `/expense $45 lunch with client`',
      };
    }
  }
}
