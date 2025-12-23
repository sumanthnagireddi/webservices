import { Controller, Get } from '@nestjs/common';
import { ResourceService } from './resource.service';
import { Resource } from './resource.schema';

@Controller('resource')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get()
  async getAllResources(): Promise<Resource[]> {
    return this.resourceService.getAllResources();
  }
}
