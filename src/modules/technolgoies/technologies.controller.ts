import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
// import { TechnologyService } from './technology.service';
import { CreateTechnologyDto } from './dto/create-technology.dto';
import { TechnologyService } from './technologies.service';
// import { UpdateTechnologyDto } from './dto/update-technology.dto';

@Controller('technologies')
export class TechnologyController {
  constructor(private readonly technologyService: TechnologyService) {}

  @Post()
  create(@Body() dto: CreateTechnologyDto) {
    // TEMP: replace with auth userId later
    const userId = '64f1a1c2a12b3c001a000001';
    return this.technologyService.create(dto, userId);
  }

  @Get()
  findAllPublic() {
    return this.technologyService.findAllPublic();
  }

  @Get('my')
  findMyTechnologies() {
    const userId = '64f1a1c2a12b3c001a000001';
    return this.technologyService.findByUser(userId);
  }

//   @Get(':slug')
//   findBySlug(@Param('slug') slug: string) {
//     return this.technologyService.findBySlug(slug);
//   }

//   @Patch(':id')
//   update(
//     @Param('id') id: string,
//     @Body() dto: UpdateTechnologyDto,
//   ) {
//     return this.technologyService.update(id, dto);
//   }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.technologyService.delete(id);
  }
}
