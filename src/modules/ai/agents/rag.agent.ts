import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../searvices/llm.service';
import { NvidiaLlmService, NvidiaModel } from '../searvices/nvidia-llm.service';
import { VectorService } from '../searvices/vector.service';
import { Response } from 'express';

@Injectable()
export class RagAgent {
  private readonly logger = new Logger(RagAgent.name);

  constructor(
    private vector: VectorService,
    private llm: LlmService,
    private nvidiaLlm: NvidiaLlmService,
  ) {}

  async ask(question: string, useNvidia = true, nvidiaModel?: NvidiaModel) {
    this.logger.log(`Processing question: "${question}"`);

    // const searchResults = await this.vector.search(question, 5);

    // if (!searchResults.length) {
    //   return {
    //     status: 'success',
    //     data: "I don't have relevant information in the knowledge base.",
    //   };
    // }

    // const context = searchResults
    //   .map(
    //     (r, i) =>
    //       `[${i + 1}] ${r.type.toUpperCase()}: ${r.title}\n${r.text}\n(Relevance: ${(r.score * 10).toFixed(1)}/10)`,
    //   )
    //   .join('\n\n---\n\n');

    // ✅ Proper RAG system prompt
    const systemPrompt = `You are a helpful assistant. Answer questions.`;

    const prompt = `QUESTION: ${question}`;

    if (useNvidia) {
      return this.nvidiaLlm.ask(prompt, nvidiaModel, systemPrompt);
    }

    // Falls back to Gemini
    return this.llm.ask(`${systemPrompt}\n\n${prompt}`);
  }
  async askStream(question: string, res: Response, useNvidia = true) {
    const searchResults = await this.vector.search(question, 5);

    const context = searchResults
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.text}`)
      .join('\n\n---\n\n');

    const systemPrompt = `Answer using ONLY this context:\n\n${context}`;
    const prompt = `QUESTION: ${question}`;

    return this.nvidiaLlm.askStream(prompt, res, undefined, systemPrompt);
  }
}
