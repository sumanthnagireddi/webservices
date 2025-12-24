import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CreateTechnologyDto } from './dto/create-technology.dto';
import { UpdateTechnologyDto } from './dto/update-technology.dto';
import { TestService } from './test.service';

@Controller('test')
export class TestController {
  constructor(private readonly technologyService: TestService) {}

  // CREATE
  @Post()
  create(@Body() dto: CreateTechnologyDto) {
    // TEMP: replace with auth userId later
    const userId = '64f1a1c2a12b3c001a000001';
    return this.technologyService.create(dto, userId);
  }

  // GET ALL (PUBLIC)
  @Get()
  findAllPublic() {
    return this.technologyService.findAllPublic();
  }

  // ✅ GET BY ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.technologyService.findById(id);
  }

  // ✅ FULL UPDATE (PUT)
  @Put(':id')
  updateFull(
    @Param('id') id: string,
    @Body() dto: UpdateTechnologyDto,
  ) {
    return this.technologyService.updateFull(id, dto);
  }

  // PARTIAL UPDATE (PATCH)
  @Patch(':id')
  updatePartial(
    @Param('id') id: string,
    @Body() dto: UpdateTechnologyDto,
  ) {
    return this.technologyService.update(id, dto);
  }

  // DELETE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.technologyService.delete(id);
  }
}
