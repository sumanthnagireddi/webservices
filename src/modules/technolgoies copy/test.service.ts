import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTechnologyDto } from './dto/create-technology.dto';
import { Technology, TechnologyDocument } from './technologies.schema';
import { UpdateTechnologyDto } from './dto/update-technology.dto';
import { Test, TestDocument } from './test.schema';

@Injectable()
export class TestService {
  constructor(
    @InjectModel(Test.name)
    private readonly testModel: Model<TestDocument>,
  ) {}

  async create(dto: CreateTechnologyDto, userId: string): Promise<Test> {
    const existingTechnology = await this.testModel.findOne({
      name: dto.name,
    });
    if (existingTechnology) {
      throw new ConflictException('Technology already exists');
    }

    return await this.testModel.create({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });
  }

  async findAllPublic(): Promise<Technology[]> {
    return this.testModel.find().sort({ createdAt: -1 });
  }

  async findByUser(userId: string): Promise<Technology[]> {
    return this.testModel.find({
      createdBy: new Types.ObjectId(userId),
    });
  }

  async update(id: string, dto: UpdateTechnologyDto): Promise<Technology> {
    const updated = await this.testModel.findByIdAndUpdate(id, dto, {
      new: true,
    });

    if (!updated) {
      throw new NotFoundException('Technology not found');
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.testModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Technology not found');
    }
  }
  findById(id: string) {
    return this.testModel.findById(id);
  }

  updateFull(id: string, dto: UpdateTechnologyDto) {
    return this.testModel.findByIdAndUpdate(id, dto, {
      new: true,
      overwrite: true,
    });
  }
}
