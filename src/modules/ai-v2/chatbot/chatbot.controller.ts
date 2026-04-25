import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { MessageDto, ResetSessionDto } from './chatbot.dto';

@ApiTags('Chatbot')
@ApiBearerAuth()
@Controller('ai/v2')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('ask')
  @ApiOperation({ summary: 'Send a message to the AI chatbot' })
  async sendMessage(@Body() dto: MessageDto) {
    return this.chatbotService.handleMessage(dto);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Clear a chat session history' })
  async resetSession(@Body() dto: ResetSessionDto) {
    return this.chatbotService.resetSession(dto.sessionId);
  }
}
