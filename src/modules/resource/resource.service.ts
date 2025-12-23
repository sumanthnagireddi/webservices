import { Injectable } from '@nestjs/common';
import { Resource } from './resource.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class ResourceService {
  constructor(
    @InjectModel(Resource.name) private readonly resourceModel: Model<Resource>,
  ) {}

  async getAllResources(): Promise<Resource[]> {
    return this.resourceModel.find().exec();
  }
}
