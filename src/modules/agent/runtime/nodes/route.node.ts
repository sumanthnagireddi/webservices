// route.node.ts
import { Injectable, Logger } from '@nestjs/common';
import { ROUTE_REGISTRY, RouteDecision, RouteType } from '../types/route.types';
import { buildRoutePrompt } from '../../prompts/route.prompt';
import { NvidiaProvider } from '../../llm/providers/nvidia.provider';

const CONFIDENCE_THRESHOLD = 0.65;
const FALLBACK_ROUTE: RouteType = 'chat';

@Injectable()
export class RouteNode {
  private readonly logger = new Logger(RouteNode.name);

  constructor(private readonly nvidiaProvider: NvidiaProvider) { }

  async run(state: Record<string, unknown>): Promise<Record<string, unknown>> {
    const message = (state.message as string) ?? '';
    const conversationContext = this.extractContext(state);

    let decision: RouteDecision;

    try {
      decision = await this.classifyWithLlm(message, conversationContext);
    } catch (err) {
      this.logger.warn(`LLM routing failed, falling back to keyword router: ${err}`);
      decision = this.keywordFallback(message); // keyword logic as last resort
    }

    this.logger.debug(
      `Routed "${message.slice(0, 60)}…" → ${decision.route} ` +
      `(confidence=${decision.confidence}, reason="${decision.reasoning}")`
    );

    // Emit a metric so you can monitor misclassifications over time
    this.emitRoutingMetric(decision);

    return {
      ...state,
      route: decision.route,
      routeDecision: decision,                          // full decision for downstream nodes
      needsClarification: decision.needsClarification,
    };
  }

  // ─── LLM Classification ───────────────────────────────────────────────────

  private async classifyWithLlm(
    message: string,
    context?: string,
  ): Promise<RouteDecision> {
    const prompt = buildRoutePrompt(message, context);

    const { content } = await this.nvidiaProvider.generate({
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

  // ─── Keyword Fallback (runs only if LLM throws) ───────────────────────────

  private keywordFallback(message: string): RouteDecision {
    const lower = message.toLowerCase();
    let route: RouteType = FALLBACK_ROUTE;

    if (this.matches(lower, ['expense', 'transaction', 'finance', 'amount', 'pay'])) {
      route = 'finance-transaction';
    } else if (this.matches(lower, ['create', 'write', 'new']) && this.matches(lower, ['blog', 'post', 'article'])) {
      route = 'blog-creation';
    } else if (this.matches(lower, ['update', 'edit']) && this.matches(lower, ['blog', 'post'])) {
      route = 'blog-update';
    } else if (this.matches(lower, ['report', 'pdf', 'document', 'export'])) {
      route = 'document-generation';
    } else if (lower.includes('?') || this.matches(lower, ['how', 'what', 'why', 'explain'])) {
      route = 'question';
    }

    return {
      route,
      confidence: 0.4,          // explicitly low — came from fallback
      reasoning: 'keyword-fallback (LLM unavailable)',
      needsClarification: false,
    };
  }

  private matches(message: string, keywords: string[]): boolean {
    return keywords.some((k) => message.includes(k));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private extractContext(state: Record<string, unknown>): string | undefined {
    const history = state.conversationHistory as Array<{ role: string; content: string }> | undefined;
    if (!history?.length) return undefined;

    return history
      .slice(-3)                          // last 3 turns for context
      .map((m) => `${m.role}: ${m.content}`)
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
    // Hook this into your metrics system (Prometheus, Datadog, CloudWatch, etc.)
    // this.metrics.increment('agent.route', { route: decision.route });
    // this.metrics.histogram('agent.route.confidence', decision.confidence);
    this.logger.verbose(`[metric] route=${decision.route} confidence=${decision.confidence}`);
  }
}