import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { Response } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  tool_call_id?: string; // required when role === 'tool'
  name?: string;         // optional tool name for tool result messages
}

export interface LlmTextResult {
  type: 'text';
  content: string;
}

export interface LlmToolCallResult {
  type: 'tool_use';
  name: string;
  input: Record<string, unknown>;
  raw: Record<string, unknown>; // full assistant message from API
}

export type LlmResult = LlmTextResult | LlmToolCallResult;

export interface AskResult {
  status: 'success' | 'error';
  data: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model catalogue — single source of truth
// ─────────────────────────────────────────────────────────────────────────────

export const NVIDIA_MODELS = {
  // General purpose / default
  LLAMA_70B: 'meta/llama-3.3-70b-instruct',

  // Code tasks
  DEVSTRAL: 'mistralai/devstral-2-123b-instruct',

  // Reasoning / analysis — best for detailed technical explanations
  DEEPSEEK: 'deepseek-ai/deepseek-v3-2',

  // Agentic / tool calling
  NEMOTRON: 'nvidia/nemotron-3-super-120b-a12b',

  // Coding + multimodal
  QWEN: 'qwen/qwen3.5-122b-a10b',

  // Lightweight / fast
  PHI_MINI: 'microsoft/phi-3.5-mini-instruct',
  PHI_4: 'microsoft/phi-4-mini-instruct',

  // Small open model
  GEMMA: 'google/gemma-2-9b-it',
} as const;

export type NvidiaModel = (typeof NVIDIA_MODELS)[keyof typeof NVIDIA_MODELS];

// ─────────────────────────────────────────────────────────────────────────────
// Config defaults
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  model: NVIDIA_MODELS.LLAMA_70B,
  maxTokens: Infinity,       // raised from 1024 — was hard-cutting responses
  temperature: 0.6,      // raised from 0.2 — low temp caused terse/robotic output
  topP: 0.9,             // raised from 0.7
  retryAttempts: 3,
  retryDelayMs: 500,
  timeoutMs: 30_000,
} as const;

const BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AgenticLlmService {
  private readonly logger = new Logger(AgenticLlmService.name);

  constructor(private readonly configService: ConfigService) {}

  // ── Private helpers ────────────────────────────────────────────────────────

  private get apiKey(): string {
    const key = this.configService.get<string>('NVIDIA');
    if (!key) throw new Error('NVIDIA_API_KEY is not configured');
    return key;
  }

  private buildMessages(
    userPrompt: string,
    systemPrompt?: string,
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userPrompt });
    return messages;
  }

  /** Strips ```json ``` fences LLMs often add around JSON responses */
  private stripJsonFences(raw: string): string {
    return raw
      .replace(/```(?:json)?[\s\S]*?```/g, (m) =>
        m.replace(/```(?:json)?/g, '').replace(/```/g, ''),
      )
      .trim();
  }

  /**
   * Exponential-backoff retry wrapper.
   * Retries on network errors and 429 / 5xx responses only.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    attempts = DEFAULTS.retryAttempts,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const status = (err as AxiosError)?.response?.status;
        const isRetryable = !status || status === 429 || status >= 500;

        if (!isRetryable || attempt === attempts) break;

        const delay = DEFAULTS.retryDelayMs * 2 ** (attempt - 1);
        this.logger.warn(
          `NVIDIA API attempt ${attempt}/${attempts} failed (${status ?? 'network'}). Retrying in ${delay}ms…`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw lastError;
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  /**
   * Simple single-turn ask.
   * Best for: content generation, blog drafts, short Q&A.
   *
   * @param maxTokens — override per call (default 4096)
   *
   * @example
   * const { data } = await llm.ask('Explain NestJS guards', NVIDIA_MODELS.LLAMA_70B);
   * const { data } = await llm.ask('Summary only', NVIDIA_MODELS.PHI_4, undefined, 512);
   */
  async ask(
    prompt: string,
    model: NvidiaModel = DEFAULTS.model,
    systemPrompt?: string,
    maxTokens: number = DEFAULTS.maxTokens,
  ): Promise<AskResult> {
    const messages = this.buildMessages(prompt, systemPrompt);

    try {
      const response = await this.withRetry(() =>
        axios.post(
          BASE_URL,
          {
            model,
            messages,
            max_tokens: maxTokens,
            temperature: DEFAULTS.temperature,
            top_p: DEFAULTS.topP,
            stream: false,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              Accept: 'application/json',
            },
            timeout: DEFAULTS.timeoutMs,
          },
        ),
      );

      const text: string = response.data.choices?.[0]?.message?.content ?? '';
      this.logger.debug(`ask() → ${model} — ${text.length} chars`);
      return { status: 'success', data: text };
    } catch (err) {
      this.logger.error(
        'ask() failed',
        (err as AxiosError)?.response?.data ?? err,
      );
      throw new BadGatewayException('NVIDIA API request failed');
    }
  }

  /**
   * Multi-turn conversation — accepts a pre-built messages array.
   * Best for: chatbot history replay, agent loops with context.
   *
   * @param maxTokens — override per call (default 4096)
   *
   * @example
   * const result = await llm.chat(history, NVIDIA_MODELS.LLAMA_70B);
   * const result = await llm.chat(history, NVIDIA_MODELS.DEEPSEEK, 8192);
   */
  async chat(
    messages: ChatMessage[],
    model: NvidiaModel = DEFAULTS.model,
    maxTokens: number = DEFAULTS.maxTokens,
  ): Promise<AskResult> {
    if (!messages.length) {
      throw new Error('chat() requires at least one message');
    }

    try {
      const response = await this.withRetry(() =>
        axios.post(
          BASE_URL,
          {
            model,
            messages,
            max_tokens: maxTokens,
            temperature: DEFAULTS.temperature,
            top_p: DEFAULTS.topP,
            stream: false,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              Accept: 'application/json',
            },
            timeout: DEFAULTS.timeoutMs,
          },
        ),
      );

      const text: string = response.data.choices?.[0]?.message?.content ?? '';
      this.logger.debug(
        `chat() → ${model} — ${messages.length} messages in, ${text.length} chars out`,
      );
      return { status: 'success', data: text };
    } catch (err) {
      this.logger.error(
        'chat() failed',
        (err as AxiosError)?.response?.data ?? err,
      );
      throw new BadGatewayException('NVIDIA API chat request failed');
    }
  }

  /**
   * Tool-calling turn — sends messages + tools, returns either a tool-call
   * request or a final text answer.
   * Best for: agentic loops, finance extraction, structured output.
   *
   * @param maxTokens — override per call (default 4096)
   *
   * @example
   * const result = await llm.askWithTools(messages, FINANCE_TOOLS, NVIDIA_MODELS.NEMOTRON);
   * if (result.type === 'tool_use') { ... } else { result.content }
   */
  async askWithTools(
    messages: ChatMessage[],
    tools: unknown[],
    model: NvidiaModel = NVIDIA_MODELS.NEMOTRON,
    maxTokens: number = DEFAULTS.maxTokens,
  ): Promise<LlmResult> {
    try {
      const response = await this.withRetry(() =>
        axios.post(
          BASE_URL,
          {
            model,
            messages,
            tools,
            tool_choice: tools.length ? 'auto' : 'none',
            max_tokens: maxTokens,
            temperature: DEFAULTS.temperature,
            top_p: DEFAULTS.topP,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              Accept: 'application/json',
            },
            timeout: DEFAULTS.timeoutMs,
          },
        ),
      );

      const choice = response.data.choices[0];
      const message = choice.message;
      const finishReason: string = choice.finish_reason;

      if (finishReason === 'tool_calls' || message.tool_calls?.length > 0) {
        const toolCall = message.tool_calls[0];
        return {
          type: 'tool_use',
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments),
          raw: message,
        };
      }

      return { type: 'text', content: message.content ?? '' };
    } catch (err) {
      this.logger.error(
        'askWithTools() failed',
        (err as AxiosError)?.response?.data ?? err,
      );
      throw new BadGatewayException('NVIDIA API tool-calling request failed');
    }
  }

  /**
   * Continue an agentic loop after a tool result has been appended to messages.
   * Caller is responsible for appending the tool result before calling this.
   * Best for: multi-step agent loops.
   *
   * @example
   * messages.push({ role: 'tool', tool_call_id: id, content: JSON.stringify(result) });
   * const next = await llm.continueWithToolResult(messages, FINANCE_TOOLS);
   */
  async continueWithToolResult(
    messages: ChatMessage[],
    tools: unknown[],
    model: NvidiaModel = NVIDIA_MODELS.NEMOTRON,
    maxTokens: number = DEFAULTS.maxTokens,
  ): Promise<LlmResult> {
    return this.askWithTools(messages, tools, model, maxTokens);
  }

  /**
   * Streaming SSE response — writes tokens directly to Express Response.
   * Best for: real-time chat UI.
   *
   * @param maxTokens — override per call (default 4096)
   *
   * @example
   * await llm.stream('Tell me about NestJS', res, NVIDIA_MODELS.LLAMA_70B);
   */
  async stream(
    prompt: string,
    res: Response,
    model: NvidiaModel = DEFAULTS.model,
    systemPrompt?: string,
    maxTokens: number = DEFAULTS.maxTokens,
  ): Promise<void> {
    const messages = this.buildMessages(prompt, systemPrompt);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const response = await axios.post(
        BASE_URL,
        {
          model,
          messages,
          max_tokens: maxTokens,
          temperature: DEFAULTS.temperature,
          top_p: DEFAULTS.topP,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'text/event-stream',
          },
          responseType: 'stream',
          timeout: DEFAULTS.timeoutMs,
        },
      );

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((l) => l.trim());

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice('data: '.length).trim();
          if (jsonStr === '[DONE]') {
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const token: string | undefined =
              parsed.choices?.[0]?.delta?.content;
            if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
          } catch {
            // Malformed SSE chunk — skip silently
          }
        }
      });

      response.data.on('error', (err: Error) => {
        this.logger.error('Stream error', err.message);
        res.end();
      });
    } catch (err) {
      this.logger.error(
        'stream() failed to connect',
        (err as AxiosError)?.response?.data ?? err,
      );
      res.end();
      throw new BadGatewayException('NVIDIA streaming request failed');
    }
  }

  /**
   * Convenience: ask and parse the response as JSON.
   * Strips markdown fences automatically.
   * Best for: structured extraction (expenses, interview Q&A, etc.)
   *
   * @param maxTokens — override per call (default 4096)
   *
   * @example
   * const expense = await llm.askJson<ExpenseDto>(prompt, NVIDIA_MODELS.NEMOTRON, SYSTEM_PROMPT);
   */
  async askJson<T = Record<string, unknown>>(
    prompt: string,
    model: NvidiaModel = NVIDIA_MODELS.NEMOTRON,
    systemPrompt?: string,
    maxTokens: number = DEFAULTS.maxTokens,
  ): Promise<T> {
    const result = await this.ask(prompt, model, systemPrompt, maxTokens);

    if (result.status !== 'success' || !result.data) {
      throw new BadGatewayException(
        'LLM returned empty response for JSON extraction',
      );
    }

    try {
      return JSON.parse(this.stripJsonFences(result.data)) as T;
    } catch {
      this.logger.error('askJson() — JSON parse failed. Raw:', result.data);
      throw new BadGatewayException('LLM response was not valid JSON');
    }
  }
}