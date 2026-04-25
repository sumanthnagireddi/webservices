import { Injectable } from "@nestjs/common";
import { ChatOpenAI } from '@langchain/openai'; 
import { ConfigService } from "@nestjs/config";
@Injectable()
export class NvidiaLangchainLlmService {
public readonly llm: ChatOpenAI;

  constructor(private config: ConfigService) {
    this.llm = new ChatOpenAI({
      model: 'meta/llama-3.3-70b-instruct', // or any model from build.nvidia.com
      apiKey: this.config.get<string>('NVIDIA'),
      configuration: {
        baseURL: 'https://integrate.api.nvidia.com/v1',
      },
      temperature: 0.2,
      streaming: true,
    });
  }
}