import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TopicService } from './topic.service';
import { CreateTopicsDTO } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Controller('topics')
export class TopicController {
  userId = '64f1a1c2a12b3c001a000001';
  constructor(private topicService: TopicService) {}
  @Post()
  createTopic(@Body() topicDto: CreateTopicsDTO) {
    return this.topicService.createTopic(topicDto, this.userId);
  }

  @Get()
  getAllTopics() {
    return this.topicService.getAllTopics();
  }

  @Get('id')
  getTopicById(@Param('id') id: string) {
    return this.topicService.getTopicByID(id);
  }
  @Get('all/:id')
  getTopicByTechnology(@Param('id') id: string) {
    return this.topicService.getTopicByTechId(id);
  }
  // PARTIAL UPDATE (PATCH)
  @Patch(':id')
  updatePartial(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.topicService.update(id, dto);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.topicService.delete(id);
  }
}
