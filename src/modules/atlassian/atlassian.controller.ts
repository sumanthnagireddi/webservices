import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AtlassianService } from './atlassian.service';
import {
  BulkUpsertAtlassianContentDto,
  CreateAtlassianContentDto,
} from './dto/create-atlassian-content.dto';

@Controller('atlassian')
export class AtlassianController {
  constructor(private readonly atlassianService: AtlassianService) {}

  @Get('pages')
  getAllPages() {
    return this.atlassianService.getAllPages();
  }

  @Get('folders')
  getFolders() {
    return this.atlassianService.getFolderHierarchy();
  }

  @Get('folders/stored')
  getStoredFolders() {
    return this.atlassianService.getStoredFolders();
  }

  @Post('folders/sync')
  triggerFolderSync() {
    return this.atlassianService.triggerFolderSync();
  }

  @Get('pages/:id')
  getPageById(@Param('id', ParseIntPipe) id: number) {
    return this.atlassianService.getPageById(id);
  }

  @Post('content')
  upsertContent(@Body() payload: CreateAtlassianContentDto) {
    return this.atlassianService.upsertContent(payload);
  }

  @Post('content/bulk')
  bulkUpsertContent(@Body() payload: BulkUpsertAtlassianContentDto) {
    return this.atlassianService.bulkUpsertContent(payload.items);
  }

  @Get('content')
  getStoredContents() {
    return this.atlassianService.getStoredContents();
  }

  @Post('content/sync')
  triggerContentSync() {
    return this.atlassianService.triggerPageContentSync();
  }

  @Get('content/:atlassianId')
  getStoredContentById(@Param('atlassianId') atlassianId: string) {
    return this.atlassianService.getStoredContentByAtlassianId(atlassianId);
  }
}
