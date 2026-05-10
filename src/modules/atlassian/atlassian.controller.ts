import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AtlassianService } from './atlassian.service';
import {
  BulkUpsertAtlassianContentDto,
  CreateAtlassianContentDto,
} from './dto/create-atlassian-content.dto';

@ApiTags('atlassian')
@Controller('atlassian')
export class AtlassianController {
  constructor(private readonly atlassianService: AtlassianService) {}

  @Get('pages')
  @ApiOperation({ summary: 'Get Atlassian pages tree from upstream' })
  @ApiResponse({ status: 200, description: 'Returns Atlassian page tree' })
  getAllPages() {
    return this.atlassianService.getAllPages();
  }

  @Get('folders')
  @ApiOperation({
    summary: 'Get Atlassian folders, subfolders, and pages as a nested tree',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Atlassian folder hierarchy with page nodes appended',
  })
  getFolders() {
    return this.atlassianService.getFolderHierarchy();
  }

  @Get('folders/stored')
  @ApiOperation({ summary: 'Get stored Atlassian folders from MongoDB' })
  @ApiResponse({
    status: 200,
    description: 'Returns stored Atlassian folders',
  })
  getStoredFolders() {
    return this.atlassianService.getStoredFolders();
  }

  @Post('folders/sync')
  @ApiOperation({
    summary:
      'Manually trigger a missing-folder sync from Atlassian into MongoDB',
  })
  @ApiResponse({
    status: 201,
    description: 'Missing Atlassian folders synced successfully',
  })
  triggerFolderSync() {
    return this.atlassianService.triggerFolderSync();
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Get a single Atlassian page from upstream' })
  @ApiParam({ name: 'id', description: 'Atlassian page ID' })
  @ApiResponse({ status: 200, description: 'Returns Atlassian page details' })
  getPageById(@Param('id', ParseIntPipe) id: number) {
    return this.atlassianService.getPageById(id);
  }

  @Post('content')
  @ApiOperation({
    summary: 'Upsert downstream Atlassian content into the atlassianContent collection',
  })
  @ApiResponse({
    status: 201,
    description: 'Atlassian content stored successfully',
  })
  upsertContent(@Body() payload: CreateAtlassianContentDto) {
    return this.atlassianService.upsertContent(payload);
  }

  @Post('content/bulk')
  @ApiOperation({
    summary: 'Bulk upsert downstream Atlassian content into the atlassianContent collection',
  })
  @ApiResponse({
    status: 201,
    description: 'Atlassian contents stored successfully',
  })
  bulkUpsertContent(@Body() payload: BulkUpsertAtlassianContentDto) {
    return this.atlassianService.bulkUpsertContent(payload.items);
  }

  @Get('content')
  @ApiOperation({ summary: 'Get stored Atlassian content documents' })
  @ApiResponse({
    status: 200,
    description: 'Returns all stored Atlassian content',
  })
  getStoredContents() {
    return this.atlassianService.getStoredContents();
  }

  @Post('content/sync')
  @ApiOperation({
    summary:
      'Manually trigger a full Atlassian page-content sync using body-format=atlas_doc_format',
  })
  @ApiResponse({
    status: 201,
    description: 'Atlassian page-content sync started and completed',
  })
  triggerContentSync() {
    return this.atlassianService.triggerPageContentSync();
  }

  @Get('content/:atlassianId')
  @ApiOperation({ summary: 'Get a stored Atlassian content document by ID' })
  @ApiParam({ name: 'atlassianId', description: 'Stored Atlassian content ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the stored Atlassian content document',
  })
  getStoredContentById(@Param('atlassianId') atlassianId: string) {
    return this.atlassianService.getStoredContentByAtlassianId(atlassianId);
  }
}
