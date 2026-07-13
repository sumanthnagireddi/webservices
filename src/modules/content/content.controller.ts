import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  getAllContent() {
    return this.contentService.listAllContent();
  }

  @Post()
  createContent(@Body() payload: { body?: string; topicId?: string; title?: string }) {
    return this.contentService.createLocalContent(payload);
  }

  @Get('feeds')
  getFeeds(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('space') space?: string,
    @Query('type') type?: string,
    @Query('sort') sort?: string,
    @Query('tags') tags?: string,
    @Query('unread') unread?: string,
  ) {
    return this.contentService.getFeeds({
      page,
      limit,
      space,
      type,
      sort,
      unread: unread === 'true',
      tags: tags
        ? tags
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    });
  }

  @Get('recent')
  getRecent() {
    return this.contentService.getRecent();
  }

  @Get('starred')
  getStarred() {
    return this.contentService.getStarred();
  }

  @Get('search')
  searchContent(
    @Query('q') query = '',
    @Query('space') space?: string,
    @Query('type') type?: string,
    @Query('tags') tags?: string,
  ) {
    return this.contentService.searchContent({
      query,
      space,
      type,
      tags: tags
        ? tags
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    });
  }

  @Get('analytics')
  getAnalytics() {
    return this.contentService.getAnalytics();
  }

  @Get('sync-status')
  getSyncStatus() {
    return this.contentService.getSyncStatus();
  }

  @Get('spaces')
  getSpaces() {
    return this.contentService.getSpaces();
  }

  @Post('bulk-sync')
  triggerBulkSync() {
    return this.contentService.runBulkSync();
  }

  @Get(':id/history')
  getContentHistory(@Param('id') id: string) {
    return this.contentService.getVersionHistory(id);
  }

  @Post(':id/star')
  starContent(@Param('id') id: string) {
    return this.contentService.setStarred(id, true);
  }

  @Delete(':id/star')
  unstarContent(@Param('id') id: string) {
    return this.contentService.setStarred(id, false);
  }

  @Post(':id/read')
  markContentRead(@Param('id') id: string) {
    return this.contentService.markAsRead(id);
  }

  @Post(':id/duplicate')
  duplicateContent(@Param('id') id: string) {
    return this.contentService.duplicateContent(id);
  }

  @Patch(':id/sync')
  syncSingleContent(@Param('id') id: string) {
    return this.contentService.syncContent(id);
  }

  @Get(':id')
  getContentById(@Param('id') id: string) {
    return this.contentService.getContentDetail(id);
  }

  @Patch(':id')
  updateContent(@Param('id') id: string, @Body() payload: { body?: string; title?: string }) {
    return this.contentService.updateLocalContent(id, payload);
  }

  @Put(':id')
  replaceContent(@Param('id') id: string, @Body() payload: { body?: string; title?: string }) {
    return this.contentService.updateLocalContent(id, payload);
  }
}
