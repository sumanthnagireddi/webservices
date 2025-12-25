import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TopicDocument, Topics } from './topics.schema';
import { TopicsModule } from './topics.module';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateTopicsDTO } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class TopicService {
  constructor(
    @InjectModel(Topics.name)
    private readonly topicModel: Model<TopicDocument>,
  ) {}

  async createTopic(dto: CreateTopicsDTO, userId: string) {
    const existingTopic = await this.topicModel.findOne({
      name: dto.name,
    });
    if (existingTopic) {
      throw new ConflictException('Topic already exists');
    }

    return await this.topicModel.create({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });
  }

  async getAllTopics(): Promise<Topics[]> {
    return await this.topicModel.find().sort({ createdAt: -1 });
  }

  async getTopicByID(id: string) {
    return await this.topicModel.findById(id);
  }
  async getTopicByTechId(id: string) {
    return await this.topicModel.find({ technologyId: id });
  }
  async update(id: string, dto: UpdateTopicDto): Promise<Topics> {
    const updated = await this.topicModel.findByIdAndUpdate(id, dto, {
      new: true,
    });

    if (!updated) {
      throw new NotFoundException('Topic not found');
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.topicModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Topic not found');
    }
  }
}
