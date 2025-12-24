import { Module } from '@nestjs/common';
import { TopicService } from './topic.service';
import { TopicController } from './topics.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Topics, TopicSchema } from './topics.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Topics.name,
        schema: TopicSchema,
      },
    ]),
  ],
  controllers: [TopicController],
  providers: [TopicService],
})
export class TopicsModule {}
