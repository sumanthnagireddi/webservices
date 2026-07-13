import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CreatePageDto,
  UpdatePageDto,
} from './dto/create-atlassian-content.dto';
import { AtlassianServiceV2 } from './atlassianV2.service';
import { ConfluenceSyncCron } from './atlassian-cron.service';

@Controller('atlassian')
export class AtlassianController {
  constructor(private readonly atlassianV2: AtlassianServiceV2, private readonly confluenceSync: ConfluenceSyncCron) {}

  // ─── NEW: FOLDERS & SUBFOLDERS ─────────────────────────────────────────────

  /**
   * GET /atlassian/v2/folders
   * Returns full folder + subfolder tree in one call
   * Response: { id, title, spaceKey, children: [...subfolders] }[]
   */
  @Get('v2/folders')
  getFolderTree(@Query('spaceKey') spaceKey?: string): Promise<any[]> {
    return this.atlassianV2.getFolderTree(spaceKey);
  }

  @Get('v2/folders/tree')
  getFolderTreeAlias(@Query('spaceKey') spaceKey?: string): Promise<any[]> {
    return this.atlassianV2.getFolderTree(spaceKey);
  }

  // ─── NEW: PAGE CONTENT ON CLICK ────────────────────────────────────────────

  /**
   * GET /atlassian/v2/pages/:pageId
   * Returns full page body + metadata for a specific page
   * Called when user clicks a page in the UI
   */
  @Get('v2/pages/:pageId')
  getPageContent(@Param('pageId') pageId: string): Promise<any> {
    return this.atlassianV2.getPageContent(pageId);
  }

  // ─── NEW: CREATE PAGE ──────────────────────────────────────────────────────

  /**
   * POST /atlassian/v2/pages
   * Creates a new page in Confluence + saves to MongoDB
   * Body: { title, spaceKey, parentId?, body }
   */
  @Post('v2/pages')
  createPage(@Body() dto: CreatePageDto): Promise<any> {
    return this.atlassianV2.createPage(dto);
  }

  // ─── NEW: UPDATE PAGE ──────────────────────────────────────────────────────

  /**
   * PUT /atlassian/v2/pages/:pageId
   * Updates title/body of an existing page in Confluence + MongoDB
   * Body: { title, body }
   */
  @Put('v2/pages/:pageId')
  updatePage(
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePageDto,
  ): Promise<any> {
    return this.atlassianV2.updatePage(pageId, dto);
  }

  // ─── NEW: DELETE PAGE ──────────────────────────────────────────────────────

  /**
   * DELETE /atlassian/v2/pages/:pageId
   * Deletes page from Confluence (moves to trash) + marks deleted in MongoDB
   */
  @Delete('v2/pages/:pageId')
  deletePage(@Param('pageId') pageId: string): Promise<any> {
    return this.atlassianV2.deletePage(pageId);
  }

  /**
   * POST /atlassian/v2/sync
   * Triggers a manual sync. Body: { full?: boolean }
   */
  @Post('v2/sync')
  async triggerSync(@Body() body: { full?: boolean } = {}): Promise<any> {
    if (body.full) {
      // start full sync (may be long-running)
      this.confluenceSync.fullSync().catch((err) => this.confluenceSync['logger'].error('Manual full sync failed', err?.message ?? err));
      return { started: true, type: 'full' };
    }

    this.confluenceSync.incrementalSync().catch((err) => this.confluenceSync['logger'].error('Manual incremental sync failed', err?.message ?? err));
    return { started: true, type: 'incremental' };
  }
}
