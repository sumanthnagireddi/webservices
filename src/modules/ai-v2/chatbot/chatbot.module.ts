import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ShortcutParser } from './shortcut.parser';
import { AgentsModule } from '../agents/agents.module';
import { NvidiaLangchainLlmService } from '../agents/nvidia_langchain_llm.service';
// MemoryModule is @Global(), no need to import it explicitly

@Module({
  imports: [AgentsModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, ShortcutParser,NvidiaLangchainLlmService],
})
export class ChatbotModule {}
