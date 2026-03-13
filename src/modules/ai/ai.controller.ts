import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { UpdateAiDto } from './dto/update-ai.dto';
import { RagAgent } from './agents/rag.agent';
import type { Response } from 'express';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private rag: RagAgent,
  ) {}

  @Post('ask')
  ask(@Body('question') question: string) {
    return this.rag.ask(question);
  }
  @Post('ask/stream')
  askStream(@Query('question') question: string, @Res() res: Response) {
    return this.rag.askStream(question, res);
  }
  @Get()
  findAll() {
    return this.aiService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAiDto: UpdateAiDto) {
    return this.aiService.update(+id, updateAiDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiService.remove(+id);
  }
}
