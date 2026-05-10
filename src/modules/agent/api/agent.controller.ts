import { Body, Controller, Get, Post } from '@nestjs/common';
import { AgentService } from '../application/agent.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ResetSessionDto } from './dto/reset-session.dto';
import { ConversationsService } from '../application/conversations.service';

// Controller for agent requests. This should stay thin and delegate business
// logic to the application layer.
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService,private readonly conversationsService: ConversationsService) {}

  // Main sync endpoint for a user message.
  @Post('message')
  async sendMessage(@Body() dto: SendMessageDto) {
    return this.agentService.handleMessage(dto);
  }

  // Main sync endpoint for a user conversations.
  @Get('conversations')
  async listConversations() {
    return this.conversationsService.listConversations();
  }

  // Session reset endpoint for clearing current agent state.
  @Post('reset')
  async resetSession(@Body() dto: ResetSessionDto) {
    return this.agentService.resetSession(dto.sessionId);
  }
}
