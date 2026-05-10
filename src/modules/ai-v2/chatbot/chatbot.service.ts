import { Injectable, Logger } from '@nestjs/common';
import { MemoryService } from '../memory/memory.service';
import { OrchestratorService } from '../agents/orchestrator.service';
import { ShortcutParser } from './shortcut.parser';
import { MessageDto } from './chatbot.dto';
import { ChatMessage } from '../memory/memory.types';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { NvidiaLangchainLlmService } from '../agents/nvidia_langchain_llm.service';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { MASTER_SYSTEM_PROMPT } from '../agents/rag/rag.agent';

export interface ChatbotReply {
  data: string;
  sessionId: string;
  usedShortcut: boolean;
  command: string | null;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly memoryService: MemoryService,
    private readonly orchestrator: OrchestratorService,
    private readonly shortcutParser: ShortcutParser,
    private readonly nvidiaService: NvidiaLangchainLlmService,
  ) {}

async handleMessage(dto: MessageDto) {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', MASTER_SYSTEM_PROMPT],
    ['human', '{question}'],
  ]);

  const chain = prompt
    .pipe(this.nvidiaService.llm)
    .pipe(new StringOutputParser());

  const response = await chain.invoke({ question: dto.message }); // â† await here

  return { data: response };

    // const { sessionId, message, userId = 'anonymous' } = dto;

    // // 1. Parse for shortcut commands
    // const parsed = this.shortcutParser.parse(message);

    // // 2. Append user message to session history
    // const userMsg: ChatMessage = {
    //   role: 'user',
    //   content: message,
    //   timestamp: new Date(),
    // };
    // await this.memoryService.appendMessage(sessionId, userId, userMsg);

    // let data: string;

    // if (parsed.isShortcut) {
    //   // 3a. Route to agent via orchestrator
    //   this.logger.log(`Shortcut detected: ${parsed.command}`);
    //   const result = await this.orchestrator.dispatch({
    //     command: parsed.command!,
    //     args: parsed.args,
    //     sessionId,
    //     userId,
    //   });
    //   data = result.message;
    // } else {
    //   // 3b. Plain conversational turn â€” inject history + call LLM
    //   const history = await this.memoryService.getHistory(sessionId);
    //   data = await this.orchestrator.chat(history, message);
    // }

    // // 4. Append assistant reply to history
    // const assistantMsg: ChatMessage = {
    //   role: 'assistant',
    //   content: data,
    //   timestamp: new Date(),
    // };
    // await this.memoryService.appendMessage(sessionId, userId, assistantMsg);

    // return {
    //   data,
    //   sessionId,
    //   usedShortcut: parsed.isShortcut,
    //   command: parsed.command,
    // };
  }

  async resetSession(sessionId: string): Promise<{ success: boolean }> {
    await this.memoryService.clearSession(sessionId);
    return { success: true };
  }
}
