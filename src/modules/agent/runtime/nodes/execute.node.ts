import { Injectable, Logger } from '@nestjs/common';
import { ProviderFactoryService } from '../../llm/provider-factory.service';

// Execute node calls the active model and drafts the final user response.
@Injectable()
export class ExecuteNode {
  private readonly logger = new Logger(ExecuteNode.name);

  constructor(private readonly providerFactory: ProviderFactoryService) {}

  async run(state: Record<string, unknown>) {
    const provider = this.providerFactory.get();
    const route = String(state.route ?? 'chat');
    const message = String(state.message ?? '');
    const plan = this.formatPlan(state.plan);
    const knowledge = this.formatKnowledge(state.knowledge);

    const { content } = await provider.generate({
      systemPrompt: [
        'You are the execution node for an AI agent.',
        'Answer the user directly using the supplied route, plan, and knowledge.',
        'Be accurate, practical, and concise.',
        'If the provided knowledge is thin, answer with best effort and say what is uncertain.',
      ].join(' '),
      userPrompt: [
        `Route: ${route}`,
        `Plan:\n${plan}`,
        `Knowledge:\n${knowledge}`,
        `User message:\n${message}`,
      ].join('\n\n'),
      context: { route },
    });

    const draft = content.trim();

    this.logger.debug(
      `Generated agent response with provider=${provider.name} route=${route}`,
    );

    return {
      ...state,
      execution: {
        decision: 'answer',
        draft: draft || 'I could not generate a response.',
      },
    };
  }

  private formatPlan(plan: unknown): string {
    if (!Array.isArray(plan) || !plan.length) {
      return '1. Understand the request\n2. Answer directly';
    }

    return plan.map((step, index) => `${index + 1}. ${String(step)}`).join('\n');
  }

  private formatKnowledge(knowledge: unknown): string {
    if (!Array.isArray(knowledge) || !knowledge.length) {
      return 'No additional knowledge retrieved.';
    }

    return knowledge.map((item) => `- ${String(item)}`).join('\n');
  }
}
