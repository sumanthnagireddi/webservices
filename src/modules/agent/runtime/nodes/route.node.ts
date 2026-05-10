import { Injectable, Logger } from '@nestjs/common';
import { buildRoutePrompt } from '../../prompts/route.prompt';
import { ProviderFactoryService } from '../../llm/provider-factory.service';
import { ROUTE_REGISTRY, RouteDecision, RouteType } from '../types/route.types';

const FALLBACK_ROUTE: RouteType = 'chat';

@Injectable()
export class RouteNode {
  private readonly logger = new Logger(RouteNode.name);

  constructor(private readonly providerFactory: ProviderFactoryService) {}

  async run(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const message = (state.message as string) ?? '';
    const conversationContext = this.extractContext(state);

    let decision: RouteDecision;

    try {
      decision = await this.classifyWithLlm(message, conversationContext);
    } catch (err) {
      this.logger.warn(`LLM routing failed, falling back to keyword router: ${err}`);
      decision = this.keywordFallback(message);
    }

    this.logger.debug(
      `Routed "${message.slice(0, 60)}..." -> ${decision.route} ` +
        `(confidence=${decision.confidence}, reason="${decision.reasoning}")`,
    );

    this.emitRoutingMetric(decision);

    return {
      ...state,
      route: decision.route,
      routeDecision: decision,
      needsClarification: decision.needsClarification,
    };
  }

  private async classifyWithLlm(
    message: string,
    context?: string,
  ): Promise<RouteDecision> {
    const provider = this.providerFactory.get();
    const prompt = buildRoutePrompt(message, context);

    const { content } = await provider.generate({
      systemPrompt: 'You are a routing classifier. Output only valid JSON.',
      userPrompt: prompt,
    });

    const parsed = this.parseRouteResponse(content);
    this.validateRoute(parsed.route);

    return parsed;
  }

  private parseRouteResponse(raw: string): RouteDecision {
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        route: parsed.route ?? FALLBACK_ROUTE,
        confidence: Number(parsed.confidence ?? 0.5),
        reasoning: parsed.reasoning ?? '',
        alternativeRoute: parsed.alternativeRoute ?? undefined,
        needsClarification: parsed.needsClarification ?? false,
      };
    } catch {
      this.logger.error(`Failed to parse route JSON: ${raw}`);
      return this.unknownFallback();
    }
  }

  private validateRoute(route: string): asserts route is RouteType {
    if (!(route in ROUTE_REGISTRY)) {
      throw new Error(`LLM returned unknown route: "${route}"`);
    }
  }

  private keywordFallback(message: string): RouteDecision {
    const lower = message.toLowerCase();
    let route: RouteType = FALLBACK_ROUTE;

    if (this.matches(lower, ['expense', 'transaction', 'finance', 'amount', 'pay'])) {
      route = 'finance-transaction';
    } else if (
      this.matches(lower, ['create', 'write', 'new']) &&
      this.matches(lower, ['blog', 'post', 'article'])
    ) {
      route = 'blog-creation';
    } else if (
      this.matches(lower, ['update', 'edit']) &&
      this.matches(lower, ['blog', 'post'])
    ) {
      route = 'blog-update';
    } else if (this.matches(lower, ['report', 'pdf', 'document', 'export'])) {
      route = 'document-generation';
    } else if (
      lower.includes('?') ||
      this.matches(lower, ['how', 'what', 'why', 'explain'])
    ) {
      route = 'question';
    }

    return {
      route,
      confidence: 0.4,
      reasoning: 'keyword-fallback (LLM unavailable)',
      needsClarification: false,
    };
  }

  private matches(message: string, keywords: string[]): boolean {
    return keywords.some((keyword) => message.includes(keyword));
  }

  private extractContext(state: Record<string, unknown>): string | undefined {
    const history = state.conversationHistory as
      | Array<{ role: string; content: string }>
      | undefined;

    if (!history?.length) {
      return undefined;
    }

    return history
      .slice(-3)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');
  }

  private unknownFallback(): RouteDecision {
    return {
      route: FALLBACK_ROUTE,
      confidence: 0,
      reasoning: 'parse-error fallback',
      needsClarification: false,
    };
  }

  private emitRoutingMetric(decision: RouteDecision): void {
    this.logger.verbose(`[metric] route=${decision.route} confidence=${decision.confidence}`);
  }
}
