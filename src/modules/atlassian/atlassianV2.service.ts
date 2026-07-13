import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import {
  ContentVersion,
  ContentVersionDocument,
} from '../content/content.schemas';
import {
  AtlassianContent,
  AtlassianContentDocument,
} from './atlassian-content.schema';
import {
  AtlassianFolder,
  AtlassianFolderDocument,
} from './atlassian-folder.schema';
import {
  ConfluenceFolder,
  ConfluenceFolderDocument,
} from './atlassian-sync.schemas';
import { ConfluencePage, ConfluencePageDocument } from './atlassian-sync.schemas';
import { AtlassianPageSummary } from './atlassian.interfaces';
import {
  CreatePageDto,
  UpdatePageDto,
} from './dto/create-atlassian-content.dto';

// ─── RESPONSE TYPES ────────────────────────────────────────────────────────────

interface FolderNode {
  id: string;
  type: 'space' | 'folder' | 'page';
  title: string;
  spaceKey: string;
  parentId: string | null;
  children: FolderNode[];
}

interface PageContentResponse {
  id: string;
  title: string;
  spaceKey: string;
  parentId: string | null;
  body: string; // rendered HTML
  version: number;
  lastModifiedBy: string;
  lastModifiedAt: string;
  url: string; // direct Confluence link
}

interface ConfluenceApiPage {
  id: string;
  title: string;
  type: string;
  status: string;
  space: { key: string };
  version: { number: number; when: string; by: { displayName: string } };
  ancestors: Array<{ id: string; title: string }>;
  body?: {
    storage?: { value: string };
    view?: { value: string };
  };
  _links?: { webui?: string };
}

// ─── SERVICE ───────────────────────────────────────────────────────────────────

@Injectable()
export class AtlassianServiceV2 {
  private readonly logger = new Logger(AtlassianServiceV2.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    @InjectModel(AtlassianContent.name)
    private readonly atlassianContentModel: Model<AtlassianContentDocument>,
    @InjectModel(AtlassianFolder.name)
    private readonly atlassianFolderModel: Model<AtlassianFolderDocument>,
    @InjectModel(ConfluenceFolder.name)
    private readonly confluenceFolderModel: Model<ConfluenceFolderDocument>,
    @InjectModel(ConfluencePage.name)
    private readonly confluencePageModel: Model<ConfluencePageDocument>,
    @InjectModel(ContentVersion.name)
    private readonly contentVersionModel: Model<ContentVersionDocument>,
  ) {}

  // ─── 1. GET FOLDER + SUBFOLDER TREE ─────────────────────────────────────────

  /**
   * Fetches all pages from Confluence and builds a nested folder tree.
   * Only returns structure (id, title, children) — NOT page body content.
   * Page bodies are fetched separately via getPageContent() on click.
   */
// ─── 1. GET FOLDER + SUBFOLDER TREE (from MongoDB only) ──────────────────────
async getFolderTree(spaceKey?: string): Promise<FolderNode[]> {
  const folderFilter: any = { status: { $ne: 'deleted' } };
  const pageFilter: any = { status: { $ne: 'trashed' } };
  if (spaceKey) {
    folderFilter.spaceKey = spaceKey;
    pageFilter.spaceKey = spaceKey;
  }

  const allFolders = await this.confluenceFolderModel.find(folderFilter).lean().exec();
  const allPages = await this.confluencePageModel.find(pageFilter).lean().exec();

  const nodeMap = new Map<string, FolderNode>();
  for (const folder of allFolders) {
    nodeMap.set(folder.confluenceId, {
      id: folder.confluenceId,
      type: folder.type === 'space' ? 'space' : 'folder',
      title: folder.title,
      spaceKey: folder.spaceKey ?? '',
      parentId: folder.parentId ?? null,
      children: [],
    });
  }

  for (const page of allPages) {
    if (!nodeMap.has(page.confluenceId)) {
      nodeMap.set(page.confluenceId, {
        id: page.confluenceId,
        type: 'page',
        title: page.title,
        spaceKey: page.spaceKey ?? '',
        parentId: page.parentId ?? null,
        children: [],
      });
    } else {
      const existing = nodeMap.get(page.confluenceId)!;
      existing.title = existing.title || page.title;
      existing.spaceKey = existing.spaceKey || page.spaceKey || '';
      existing.type = existing.type || 'page';
    }
  }

  const attached = new Set<string>();
  for (const folder of allFolders) {
    const parentNode = nodeMap.get(folder.confluenceId);
    if (!parentNode) continue;

    const childPageIds = Array.isArray(folder.childPageIds) ? folder.childPageIds : [];
    for (const childId of childPageIds) {
      const childNode = nodeMap.get(childId);
      if (!childNode) continue;
      if (!parentNode.children.some((child) => child.id === childId)) {
        parentNode.children.push(childNode);
      }
      attached.add(childId);
    }
  }

  for (const node of nodeMap.values()) {
    if (attached.has(node.id)) continue;
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parentNode = nodeMap.get(node.parentId)!;
      if (!parentNode.children.some((child) => child.id === node.id)) {
        parentNode.children.push(node);
      }
      attached.add(node.id);
    }
  }

  const roots: FolderNode[] = [];
  for (const node of nodeMap.values()) {
    if (!attached.has(node.id)) {
      roots.push(node);
    }
  }

  this.logger.log(`Folder tree from DB: ${roots.length} roots, ${allFolders.length} total`);
  return roots;
}

// ─── 2. GET PAGE CONTENT (from MongoDB only) ──────────────────────────────────
async getPageContent(pageId: string): Promise<PageContentResponse> {
  const page = await this.atlassianContentModel
    .findOne({ atlassianId: pageId, status: { $ne: 'trashed' } })
    .lean()
    .exec();

  if (!page) {
    throw new NotFoundException(`Page ${pageId} not found. It may not be synced yet — wait for the next cron run.`);
  }

  return {
    id: page.atlassianId,
    title: page.title,
    spaceKey: (page as any).spaceKey ?? '',
    parentId: (page as any).parentId ?? null,
    body: (page as any).body ?? '',
    version: (page as any).version ?? 1,
    lastModifiedBy: (page as any).lastModifiedBy ?? '',
    lastModifiedAt: (page as any).updatedAt?.toISOString() ?? '',
    url: `${this.getUrl()}/wiki/spaces/${(page as any).spaceKey ?? ''}/pages/${pageId}`,
  };
}

  // ─── 3. CREATE PAGE ──────────────────────────────────────────────────────────

  /**
   * Creates a new page in Confluence, then saves it to MongoDB.
   * Body: { title, spaceKey, parentId?, body (HTML string) }
   */
  async createPage(dto: CreatePageDto): Promise<PageContentResponse> {
    const url = `${this.getUrl()}/wiki/rest/api/content`;

    const payload = {
      type: 'page',
      title: dto.title,
      space: { key: dto.spaceKey },
      body: {
        storage: {
          value: dto.body,
          representation: 'storage',
        },
      },
      ...(dto.parentId && {
        ancestors: [{ id: dto.parentId }],
      }),
    };

    const res = await firstValueFrom(
      this.http.post<ConfluenceApiPage>(url, payload, {
        headers: this.getAuthHeaders(),
      }),
    );

    const created = res.data;
    if (!created?.id)
      throw new BadRequestException('Failed to create page in Confluence');

    // Save to MongoDB
    await this.atlassianContentModel.findOneAndUpdate(
      { atlassianId: created.id },
      {
        $set: {
          atlassianId: created.id,
          title: created.title,
          spaceKey: dto.spaceKey,
          parentId: dto.parentId ?? null,
          body: dto.body,
          version: 1,
          status: 'current',
          syncedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    this.logger.log(`Created page: ${created.id} — "${created.title}"`);

    return this.getPageContent(created.id);
  }

  // ─── 4. UPDATE PAGE ──────────────────────────────────────────────────────────

  /**
   * Updates title + body of an existing page.
   * Confluence requires the current version number to prevent conflicts.
   * Body: { title, body }
   */
  async updatePage(
    pageId: string,
    dto: UpdatePageDto,
  ): Promise<PageContentResponse> {
    // Step 1: Get current version from Confluence (required by API)
    const currentRes = await firstValueFrom(
      this.http.get<ConfluenceApiPage>(
        `${this.getUrl()}/wiki/rest/api/content/${pageId}`,
        {
          headers: this.getAuthHeaders(),
          params: { expand: 'version,space' },
        },
      ),
    );

    const current = currentRes.data;
    if (!current?.id) throw new NotFoundException(`Page ${pageId} not found`);

    const nextVersion = current.version.number + 1;

    // Step 2: Send update to Confluence
    const url = `${this.getUrl()}/wiki/rest/api/content/${pageId}`;
    const payload = {
      id: pageId,
      type: 'page',
      title: dto.title,
      space: { key: current.space.key },
      version: { number: nextVersion },
      body: {
        storage: {
          value: dto.body,
          representation: 'storage',
        },
      },
    };

    await firstValueFrom(
      this.http.put(url, payload, { headers: this.getAuthHeaders() }),
    );

    // Step 3: Update MongoDB
    await this.atlassianContentModel.findOneAndUpdate(
      { atlassianId: pageId },
      {
        $set: {
          title: dto.title,
          body: dto.body,
          version: nextVersion,
          syncedAt: new Date(),
        },
      },
    );

    this.logger.log(`Updated page: ${pageId} → version ${nextVersion}`);

    return this.getPageContent(pageId);
  }

  // ─── 5. DELETE PAGE ──────────────────────────────────────────────────────────

  /**
   * Deletes a page from Confluence (moves to trash).
   * Marks as deleted in MongoDB (soft delete — data preserved).
   */
  async deletePage(
    pageId: string,
  ): Promise<{ success: boolean; message: string }> {
    const url = `${this.getUrl()}/wiki/rest/api/content/${pageId}`;

    // Step 1: Delete from Confluence (moves to trash)
    try {
      await firstValueFrom(
        this.http.delete(url, { headers: this.getAuthHeaders() }),
      );
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 404)
        throw new NotFoundException(`Page ${pageId} not found in Confluence`);
      throw err;
    }

    // Step 2: Soft delete in MongoDB
    await this.atlassianContentModel.findOneAndUpdate(
      { atlassianId: pageId },
      {
        $set: {
          status: 'trashed',
          deletedAt: new Date(),
          syncedAt: new Date(),
        },
      },
    );

    this.logger.log(`Deleted page: ${pageId}`);

    return {
      success: true,
      message: `Page ${pageId} moved to trash in Confluence`,
    };
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  getUrl() {
    return this.configService.get<string>('ATLASSIAN_SITE_URL');
  }

  getSpaceKey() {
    return this.configService.get<string>('SPACE_KEY');
  }

  getAuthHeaders() {
    const apiKey = this.configService.get<string>('ATLASSIAN_API_KEY');
    const email = this.configService.get<string>('ATLASSIAN_EMAIL');
    const encoded = Buffer.from(`${email}:${apiKey}`).toString('base64');
    return {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    };
  }

  private async paginateAll<T>(
    url: string,
    params: Record<string, any> = {},
  ): Promise<T[]> {
    const results: T[] = [];
    let start = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const res = await firstValueFrom(
        this.http.get(url, {
          headers: this.getAuthHeaders(),
          params: { ...params, start, limit },
        }),
      );

      const data = res.data as {
        results: T[];
        size: number;
        totalSize?: number;
      };
      results.push(...(data.results ?? []));

      const fetched = start + (data.results?.length ?? 0);
      hasMore = fetched < (data.totalSize ?? 0);
      start = fetched;
    }

    return results;
  }

  // ─── EXISTING (kept from original) ───────────────────────────────────────────

  private async fetchAllPagesMetadata(
    url: string,
  ): Promise<AtlassianPageSummary[]> {
    const results: AtlassianPageSummary[] = [];
    const response = await firstValueFrom(
      this.http.get(url, { headers: this.getAuthHeaders() }),
    );

    const responseData = response.data as { results?: unknown[] };
    const pageResults = Array.isArray(responseData.results)
      ? (responseData.results as AtlassianPageSummary[])
      : [];

    results.push(...pageResults);
    return results;
  }

  async getAllPages() {
    return this.getFolderTree();
  }

  async getFolderHierarchy() {
    return this.getFolderTree();
  }

  async getStoredFolders() {
    return this.atlassianFolderModel.find().sort({ title: 1 }).exec();
  }

  async getStoredContents() {
    return this.atlassianContentModel.find().sort({ updatedAt: -1 }).exec();
  }

  async getStoredContentByAtlassianId(atlassianId: string) {
    const content = await this.atlassianContentModel
      .findOne({ atlassianId })
      .exec();
    if (!content) {
      throw new NotFoundException(
        `Atlassian content not found for id ${atlassianId}`,
      );
    }

    return content;
  }

  async upsertContent(payload: CreatePageDto) {
    return this.atlassianContentModel.findOneAndUpdate(
      { atlassianId: payload.parentId ?? payload.spaceKey ?? payload.title },
      {
        $set: {
          atlassianId: payload.parentId ?? payload.spaceKey ?? payload.title,
          title: payload.title,
          body: payload.body,
          spaceId: payload.spaceKey,
          parentId: payload.parentId,
        },
      },
      { new: true, upsert: true },
    );
  }

  async bulkUpsertContent(payloads: CreatePageDto[]) {
    return Promise.all(payloads.map((payload) => this.upsertContent(payload)));
  }

  triggerFolderSync() {
    return Promise.resolve({
      trigger: 'manual' as const,
      discovered: 0,
      inserted: 0,
      skippedExisting: 0,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      insertedIds: [],
    });
  }

  triggerPageContentSync() {
    return Promise.resolve({
      trigger: 'manual' as const,
      processed: 0,
      synced: 0,
      added: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      failures: [],
    });
  }

  async syncStoredContentByAtlassianId(atlassianId: string) {
    const content = await this.getStoredContentByAtlassianId(atlassianId);
    return {
      content,
      outcome: 'updated' as const,
      startedAt: new Date(),
      finishedAt: new Date(),
    };
  }

  getSyncRuntimeState() {
    return {
      isContentSyncRunning: false,
      isFolderSyncRunning: false,
    };
  }
}
