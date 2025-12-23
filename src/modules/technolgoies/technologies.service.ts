import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
// import { Technology, TechnologyDocument } from './schemas/technology.schema';
import { CreateTechnologyDto } from './dto/create-technology.dto';
import { Technology, TechnologyDocument } from './technologies.schema';
// import { UpdateTechnologyDto } from './dto/update-technology.dto';

@Injectable()
export class TechnologyService {
  constructor(
    @InjectModel(Technology.name)
    private readonly technologyModel: Model<TechnologyDocument>,
  ) {}

  async create(
    dto: CreateTechnologyDto,
    userId: string,
  ): Promise<Technology> {
    return this.technologyModel.create({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });
  }

  async findAllPublic(): Promise<Technology[]> {
    return this.technologyModel
      .find()
      .sort({ createdAt: -1 });
  }

//   async findBySlug(slug: string): Promise<Technology> {
//     const tech = await this.technologyModel.findOne({ slug });
//     if (!tech) {
//       throw new InternalServerErrorException('Technology not found');
//     }
//     return tech;
//   }

  async findByUser(userId: string): Promise<Technology[]> {
    return this.technologyModel.find({
      createdBy: new Types.ObjectId(userId),
    });
  }

//   async update(
//     id: string,
//     dto: UpdateTechnologyDto,
//   ): Promise<Technology> {
//     const updated = await this.technologyModel.findByIdAndUpdate(
//       id,
//       dto,
//       { new: true },
//     );

//     if (!updated) {
//       throw new NotFoundException('Technology not found');
//     }

//     return updated;
//   }

  async delete(id: string): Promise<void> {
    const result = await this.technologyModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Technology not found');
    }
  }
}
