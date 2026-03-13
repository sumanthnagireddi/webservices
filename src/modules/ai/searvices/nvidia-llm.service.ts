import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Response } from 'express';

export const NVIDIA_MODELS = [
  'meta/llama-3.3-70b-instruct', // Best general purpose
  'mistralai/devstral-2-123b-instruct', // Best for code tasks
  'deepseek-ai/deepseek-v3-2', // Strong reasoning
  'nvidia/nemotron-3-super-120b-a12b', // Agentic / tool calling
  'qwen/qwen3.5-122b-a10b', // Coding + multimodal
] as const;

export type NvidiaModel = (typeof NVIDIA_MODELS)[number];
type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

@Injectable()
export class NvidiaLlmService {
  private readonly logger = new Logger(NvidiaLlmService.name);
  private readonly baseUrl =
    'https://integrate.api.nvidia.com/v1/chat/completions';

  constructor(private configService: ConfigService) {}

  async ask(
    prompt: string,
    model: NvidiaModel = 'meta/llama-3.3-70b-instruct',
    systemPrompt?: string,
  ) {
    const messages: ChatMessage[] = []; // ✅ typed here

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });
    // rest of your code...

    try {
      const response = await axios.post(
        this.baseUrl,
        {
          model,
          messages,
          max_tokens: 1024,
          temperature: 0.2,
          top_p: 0.7,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.configService.get<string>('NVIDIA')}`,
            Accept: 'application/json',
          },
        },
      );

      const text = response.data.choices?.[0]?.message?.content;
      return { status: 'success', data: text };
    } catch (error) {
      this.logger.error(
        'NVIDIA API Error:',
        error?.response?.data || error.message,
      );
      throw new BadGatewayException('Failed to get response from NVIDIA API');
    }
  }

  async askStream(
    prompt: string,
    res: Response,
    model: NvidiaModel = 'meta/llama-3.3-70b-instruct',
    systemPrompt?: string,
  ) {
    const apiKey = this.configService.get<string>('NVIDIA_API_KEY');

    const messages: ChatMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    // ✅ Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const response = await axios.post(
      this.baseUrl,
      { model, messages, max_tokens: 1024, temperature: 0.2, stream: true },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'text/event-stream',
        },
        responseType: 'stream',
      },
    );

    response.data.on('data', (chunk: Buffer) => {
      const lines = chunk
        .toString()
        .split('\n')
        .filter((l) => l.trim());

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.replace('data: ', '').trim();
        if (jsonStr === '[DONE]') {
          res.write('data: [DONE]\n\n'); // signal frontend
          res.end();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`); // ✅ send token
          }
        } catch (_) {}
      }
    });

    response.data.on('error', () => res.end());
  }
}
