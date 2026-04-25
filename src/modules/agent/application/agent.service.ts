import { Injectable } from '@nestjs/common';
import { SendMessageDto } from '../api/dto/send-message.dto';
import { SessionService } from './session.service';
import { ContextBuilderService } from './context-builder.service';
import { AgentLoopRunner } from '../runtime/agent-loop.runner';
import { ResponseBuilderService } from './response-builder.service';
import { MemoryExtractorService } from './memory-extractor.service';
import { ConversationsService } from './conversations.service';
import { AgentSession } from '../domain/entities/agent-session.entity';
import { TitleGeneratorService } from './title-generator.service';

// Main use-case service for the agent feature. It should load session state,
// assemble context, run the loop, and persist any useful memory.
@Injectable()
export class AgentService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly loopRunner: AgentLoopRunner,
    private readonly responseBuilder: ResponseBuilderService,
    private readonly memoryExtractor: MemoryExtractorService,
    private readonly conversationsService: ConversationsService,
    private readonly titleGenerator: TitleGeneratorService
  ) { }

  async handleMessage(dto: SendMessageDto) {
    // const user = await this.userService.getCurrentUser();
    const user = { id: 'sumanth' }; // Placeholder for user context
    const session = await this.handleSession(dto, user.id);
    // add a new method to get the suitable and best llm model based on the user query and context
    const context = await this.contextBuilder.build(session, dto.message);
    const loopResult = await this.loopRunner.run(context);
    await this.memoryExtractor.capture(session.sessionId, dto.message, loopResult);
    await this.conversationsService.addToConversation(session.sessionId, dto.message, loopResult.answer);
    return this.responseBuilder.build(session.sessionId, loopResult);
  }

  async resetSession(sessionId: string) {
    await this.sessionService.reset(sessionId);
    return { success: true, sessionId };
  }

  async handleSession(dto: SendMessageDto, userId: string): Promise<AgentSession> {
    const sessionTitle = await this.titleGenerator.generateTitle(dto.message);
    const session = dto.sessionId
      ? await this.sessionService.load(dto.sessionId)
      : await this.sessionService.create(userId, sessionTitle);
    return session;
  }
}
