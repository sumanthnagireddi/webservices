import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { Blog } from './blog.schema';

@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  /* ---------- Create ---------- */
  @Post()
  create(@Body() body: Partial<Blog>) {
    return this.blogService.create(body);
  }

  /* ---------- Get All ---------- */
  @Get()
  findAll() {
    return this.blogService.findAll();
  }

  /* ---------- Get By ID ---------- */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.blogService.findById(id);
  }

  /* ---------- Get By Slug ---------- */
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  /* ---------- Update ---------- */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<Blog>,
  ) {
    return this.blogService.update(id, body);
  }

  /* ---------- Publish ---------- */
  @Patch(':id/publish')
  publish(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  /* ---------- Delete (Soft) ---------- */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}
