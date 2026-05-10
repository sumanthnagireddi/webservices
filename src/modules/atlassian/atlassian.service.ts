import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import {
  AtlassianContent,
  AtlassianContentDocument,
} from './atlassian-content.schema';
import {
  AtlassianFolder,
  AtlassianFolderDocument,
} from './atlassian-folder.schema';
import { CreateAtlassianContentDto } from './dto/create-atlassian-content.dto';
import {
  mapAtlassianContentPayload,
  mapAtlassianPageResponse,
} from './helpers/atlassian-content.mapper';
import {
  AtlassianFolderSummary,
  AtlassianFolderNode,
  AtlassianFolderSyncReport,
  AtlassianPageSummary,
  AtlassianPageSyncFailure,
  AtlassianPageSyncReport,
} from './atlassian.interfaces';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AtlassianService {
  private readonly logger = new Logger(AtlassianService.name);
  private isContentSyncRunning = false;
  private isFolderSyncRunning = false;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    @InjectModel(AtlassianContent.name)
    private readonly atlassianContentModel: Model<AtlassianContentDocument>,
    @InjectModel(AtlassianFolder.name)
    private readonly atlassianFolderModel: Model<AtlassianFolderDocument>,
  ) {}

  async upsertContent(
    payload: CreateAtlassianContentDto,
  ): Promise<AtlassianContentDocument> {
    const folderPath = payload.parentType === 'folder' && payload.parentId
      ? await this.getFolderPath(payload.parentId)
      : [];
    const mappedPayload = mapAtlassianContentPayload(
      payload,
      this.getUrl(),
      folderPath,
    );

    const content = await this.atlassianContentModel
      .findOneAndUpdate(
        { atlassianId: mappedPayload.atlassianId },
        { $set: mappedPayload },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    this.notificationsService.publishSuccess({
      service: 'atlassian',
      event: 'atlassian.content.upsert.success',
      message: `Stored Atlassian content ${content.atlassianId} successfully`,
      entityId: content.atlassianId,
      data: {
        title: content.title,
        parentId: content.parentId,
        bodyRepresentation: content.bodyRepresentation,
      },
    });

    return content;
  }

  async bulkUpsertContent(
    payloads: CreateAtlassianContentDto[],
  ): Promise<AtlassianContentDocument[]> {
    if (payloads.length === 0) {
      return [];
    }

    const mappedPayloads = await Promise.all(
      payloads.map(async (payload) => {
        const folderPath =
          payload.parentType === 'folder' && payload.parentId
            ? await this.getFolderPath(payload.parentId)
            : [];

        return mapAtlassianContentPayload(
          payload,
          this.getUrl(),
          folderPath,
        );
      }),
    );

    await this.atlassianContentModel.bulkWrite(
      mappedPayloads.map((item) => ({
        updateOne: {
          filter: { atlassianId: item.atlassianId },
          update: { $set: item },
          upsert: true,
        },
      })),
    );

    const contents = await this.atlassianContentModel
      .find({
        atlassianId: { $in: mappedPayloads.map((item) => item.atlassianId) },
      })
      .sort({ updatedAt: -1 })
      .exec();

    this.notificationsService.publishSuccess({
      service: 'atlassian',
      event: 'atlassian.content.bulk-upsert.success',
      message: `Stored ${contents.length} Atlassian content documents successfully`,
      data: {
        count: contents.length,
        ids: contents.map((item) => item.atlassianId),
      },
    });

    return contents;
  }

  async getStoredContents(): Promise<AtlassianContentDocument[]> {
    return this.atlassianContentModel.find().sort({ updatedAt: -1 }).exec();
  }

  async getStoredContentByAtlassianId(
    atlassianId: string,
  ): Promise<AtlassianContentDocument> {
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

  async getStoredFolders(): Promise<AtlassianFolderDocument[]> {
    return this.atlassianFolderModel.find().sort({ title: 1 }).exec();
  }

  async getAllPages() {
    const { mergedTrees, pageCount } = await this.buildFolderHierarchyWithPages();

    this.notificationsService.publishSuccess({
      service: 'atlassian',
      event: 'atlassian.pages.fetch.success',
      message: 'Fetched Atlassian pages tree successfully',
      data: {
        pageCount,
        rootCount: mergedTrees.length,
      },
    });

    return mergedTrees;
  }

  async getFolderHierarchy(): Promise<AtlassianFolderNode[]> {
    const { mergedTrees, pageCount } = await this.buildFolderHierarchyWithPages();

    this.notificationsService.publishSuccess({
      service: 'atlassian',
      event: 'atlassian.folders.fetch.success',
      message: 'Fetched Atlassian folders, subfolders, and pages successfully',
      data: {
        pageCount,
        rootCount: mergedTrees.length,
      },
    });

    return mergedTrees;
  }

  async getPageById(
    id: number,
    bodyFormat: 'storage' | 'atlas_doc_format' = 'storage',
  ) {
    const response = await firstValueFrom(
      this.http.get(`${this.getUrl()}/pages/${id}?body-format=atlas_doc_format`, {
        headers: this.getAuthHeaders(),
      }),
    );
    return response.data;
  }

  async getPageContent(id: number) {
    const page = await this.getPageById(id, 'storage');
    return page.body?.storage?.value;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncPageContentsCron() {
    await this.syncAllPageContents('cron');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncFoldersCron() {
    await this.syncMissingFolders('cron');
  }

  async triggerFolderSync() {
    return this.syncMissingFolders('manual');
  }

  async triggerPageContentSync() {
    return this.syncAllPageContents('manual');
  }

  async syncAllPageContents(
    trigger: 'cron' | 'manual',
  ): Promise<AtlassianPageSyncReport | { skipped: true; reason: string }> {
    if (this.isContentSyncRunning) {
      this.logger.warn('Skipping Atlassian content sync because one is already running');
      return {
        skipped: true,
        reason: 'Atlassian content sync is already running',
      };
    }

    this.isContentSyncRunning = true;
    const startedAt = new Date();
    const failures: AtlassianPageSyncFailure[] = [];
    let synced = 0;
    const folderCache = new Map<string, AtlassianFolderNode[]>();

    try {
      const pages = await this.fetchAllPagesMetadata();

      for (const page of pages) {
        try {
          await this.syncSinglePageContent(page, folderCache);
          synced += 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown sync error';
          failures.push({ pageId: page.id, message });
          this.logger.error(`Failed to sync Atlassian page ${page.id}: ${message}`);
        }
      }

      const report: AtlassianPageSyncReport = {
        trigger,
        processed: pages.length,
        synced,
        failed: failures.length,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        failures,
      };

      this.logger.log(
        `Atlassian content sync completed. Processed=${report.processed}, Synced=${report.synced}, Failed=${report.failed}`,
      );

      this.notificationsService.publishSuccess({
        service: 'atlassian',
        event: 'atlassian.sync.completed.success',
        message: `Completed Atlassian page-content sync with ${report.synced} successful page updates`,
        data: {
          trigger: report.trigger,
          processed: report.processed,
          synced: report.synced,
          failed: report.failed,
          startedAt: report.startedAt,
          finishedAt: report.finishedAt,
        },
      });

      return report;
    } finally {
      this.isContentSyncRunning = false;
    }
  }

  async syncMissingFolders(
    trigger: 'cron' | 'manual',
  ): Promise<AtlassianFolderSyncReport | { skipped: true; reason: string }> {
    if (this.isFolderSyncRunning) {
      this.logger.warn('Skipping Atlassian folder sync because one is already running');
      return {
        skipped: true,
        reason: 'Atlassian folder sync is already running',
      };
    }

    this.isFolderSyncRunning = true;
    const startedAt = new Date();

    try {
      const pages = await this.fetchAllPagesMetadata();
      const folderPathCache = new Map<string, AtlassianFolderNode[]>();
      const discoveredFolderIds = await this.collectUniqueFolderIds(
        pages,
        folderPathCache,
      );

      const existingFolders = await this.atlassianFolderModel
        .find(
          {
            atlassianId: { $in: discoveredFolderIds },
          },
          { atlassianId: 1 },
        )
        .lean()
        .exec();
      const existingIds = new Set(
        existingFolders.map((folder) => String(folder.atlassianId)),
      );
      const missingIds = discoveredFolderIds.filter((id) => !existingIds.has(id));

      const now = new Date();
      const missingFolders = await Promise.all(
        missingIds.map((id) =>
          this.buildFolderPersistenceInput(id, folderPathCache, now),
        ),
      );

      if (missingFolders.length > 0) {
        await this.atlassianFolderModel.bulkWrite(
          missingFolders.map((folder) => ({
            updateOne: {
              filter: { atlassianId: folder.atlassianId },
              update: { $setOnInsert: folder },
              upsert: true,
            },
          })),
        );
      }

      for (const folder of missingFolders) {
        this.notificationsService.publishSuccess({
          service: 'atlassian',
          event: 'atlassian.folder.insert.success',
          message: `Stored missing Atlassian folder ${folder.atlassianId} successfully`,
          entityId: folder.atlassianId,
          data: {
            title: folder.title,
            parentId: folder.parentId,
            type: folder.type,
          },
        });
      }

      const report: AtlassianFolderSyncReport = {
        trigger,
        discovered: discoveredFolderIds.length,
        inserted: missingFolders.length,
        skippedExisting: discoveredFolderIds.length - missingFolders.length,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        insertedIds: missingFolders.map((folder) => folder.atlassianId),
      };

      this.notificationsService.publishSuccess({
        service: 'atlassian',
        event: 'atlassian.folders.sync.completed.success',
        message: `Completed Atlassian missing-folder sync with ${report.inserted} new folders added`,
        data: {
          trigger: report.trigger,
          discovered: report.discovered,
          inserted: report.inserted,
          skippedExisting: report.skippedExisting,
          startedAt: report.startedAt,
          finishedAt: report.finishedAt,
        },
      });

      this.logger.log(
        `Atlassian folder sync completed. Discovered=${report.discovered}, Inserted=${report.inserted}, Existing=${report.skippedExisting}`,
      );

      return report;
    } finally {
      this.isFolderSyncRunning = false;
    }
  }

  async getFolderById(id: number) {
    const response = await firstValueFrom(
      this.http.get(`${this.getUrl()}/folders/${id}`, {
        headers: this.getAuthHeaders(),
      }),
    );
    const folder = response.data;
    return {
      id: String(folder.id),
      label: folder.title,
      title: folder.title,
      type: folder.type,
      parentId: folder.parentId ? String(folder.parentId) : null,
      parentType: folder.parentType,
      spaceId: folder.spaceId ? String(folder.spaceId) : undefined,
      status: folder.status,
      createdAt: folder.createdAt,
      version: folder.version,
      _links: folder._links,
      hasItems: false,
      isOpen: false,
    };
  }

  async getFolderChain(id: number, depth = 0): Promise<any[]> {
    if (depth > 10) {
      return [];
    }

    const folder = await this.getFolderById(id);
    const current = {
      id: folder.id,
      label: folder.label,
      type: folder.type,
      hasItems: false,
      isOpen: false,
      icon: 'article',
    };

    if (folder?.parentType === 'folder' && folder?.parentId !== null) {
      const ancestors = await this.getFolderChain(
        Number(folder.parentId),
        depth + 1,
      );
      return [current, ...ancestors];
    }

    return [current];
  }

  buildFolderTree(folders: AtlassianFolderNode[]): AtlassianFolderNode {
    if (folders.length === 0) {
      return undefined as unknown as AtlassianFolderNode;
    }

    const [root, ...rest] = folders;

    if (rest.length === 0) {
      return root;
    }

    return {
      ...root,
      children: [this.buildFolderTree(rest)],
    };
  }

  buildTree(folders: any[], page: any): any {
    if (folders.length === 0) {
      return page;
    }

    const [root, ...rest] = folders;
    return {
      id: root.id,
      label: root.label,
      type: root.type,
      children: this.buildTree(rest, page),
      hasItems: false,
      isOpen: false,
      icon: 'article',
    };
  }

  mergeTrees(trees: any[]): any[] {
    const map = new Map<string, any>();

    for (const tree of trees) {
      if (!tree?.id) {
        continue;
      }

      if (map.has(tree.id)) {
        const existing = map.get(tree.id);
        const mergedChildren = this.mergeChildren(
          existing.children,
          tree.children,
        );

        if (mergedChildren.length > 0) {
          existing.children = mergedChildren;
        }
      } else {
        map.set(tree.id, { ...tree });
      }
    }

    return Array.from(map.values()).map((node) => this.normalizeChildren(node));
  }

  mergeChildren(existing: any, incoming: any): any[] {
    const existingArr = this.toNodeArray(existing);
    const incomingArr = this.toNodeArray(incoming);

    if (existingArr.length === 0 && incomingArr.length === 0) {
      return [];
    }

    const map = new Map<string, any>();

    for (const child of [...existingArr, ...incomingArr]) {
      if (map.has(child.id)) {
        const found = map.get(child.id);
        if (child.children) {
          found.children = this.mergeChildren(found.children, child.children);
        }
      } else {
        map.set(child.id, { ...child });
      }
    }

    return Array.from(map.values()).map((node) => this.normalizeChildren(node));
  }

  normalizeChildren(node: any): any {
    if (!node.children) {
      return node;
    }

    const children = this.toNodeArray(node.children);

    if (children.length === 0) {
      const { children: _children, ...rest } = node;
      return rest;
    }

    return {
      ...node,
      children: children.map((child) => this.normalizeChildren(child)),
    };
  }

  private toNodeArray(value: any): any[] {
    if (!value) {
      return [];
    }

    const items = Array.isArray(value) ? value : [value];
    return items.filter((item) => item && typeof item === 'object' && item.id);
  }

  private async buildFolderHierarchyWithPages() {
    const data = await this.fetchAllPagesMetadata();
    const trees = await Promise.all(
      data
        .filter((item) => item.parentType === 'folder' && item.parentId != null)
        .map(async (page) => {
          const chain = (
            await this.getFolderChain(Number(page.parentId))
          ).reverse();

          return this.buildTree(chain, {
            id: page.id,
            label: page.title,
            type: 'page',
            hasItems: false,
            isOpen: false,
          });
        }),
    );

    return {
      mergedTrees: this.mergeTrees(trees),
      pageCount: data.length,
    };
  }

  private async collectUniqueFolderIds(
    pages: AtlassianPageSummary[],
    folderPathCache: Map<string, AtlassianFolderNode[]>,
  ): Promise<string[]> {
    const uniqueFolderIds = new Set<string>();

    for (const page of pages) {
      if (page.parentType !== 'folder' || !page.parentId) {
        continue;
      }

      const folderPath = await this.getFolderPath(page.parentId, folderPathCache);

      for (const folder of folderPath) {
        uniqueFolderIds.add(String(folder.id));
      }
    }

    return Array.from(uniqueFolderIds);
  }

  private async fetchAllPagesMetadata(): Promise<AtlassianPageSummary[]> {
    const results: AtlassianPageSummary[] = [];
    let nextUrl: string | undefined = `${this.getUrl()}/spaces/${this.getSpaceKey()}/pages?limit=250`;

    while (nextUrl) {
      const response = await firstValueFrom(
        this.http.get(nextUrl, {
          headers: this.getAuthHeaders(),
        }),
      );

      const pageResults = Array.isArray(response.data?.results)
        ? (response.data.results as AtlassianPageSummary[])
        : [];

      results.push(...pageResults);
      nextUrl = this.extractNextPageUrl(response.data);
    }

    return results;
  }

  private async syncSinglePageContent(
    page: AtlassianPageSummary,
    folderCache: Map<string, AtlassianFolderNode[]>,
  ) {
    const pageWithContent = await this.getPageById(
      Number(page.id),
      'atlas_doc_format',
    );
    const folderPath =
      page.parentType === 'folder' && page.parentId
        ? await this.getFolderPath(page.parentId, folderCache)
        : [];
    const mappedPayload = mapAtlassianPageResponse(
      pageWithContent,
      this.getUrl(),
      folderPath,
      new Date(),
    );

    const content = await this.atlassianContentModel
      .findOneAndUpdate(
        { atlassianId: mappedPayload.atlassianId },
        { $set: mappedPayload },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    this.notificationsService.publishSuccess({
      service: 'atlassian',
      event: 'atlassian.page.sync.success',
      message: `Synced Atlassian page ${content.atlassianId} successfully`,
      entityId: content.atlassianId,
      data: {
        title: content.title,
        versionNumber: content.versionNumber,
        lastContentSyncAt: content.lastContentSyncAt,
      },
    });
  }

  private async getFolderPath(
    parentId: string,
    cache = new Map<string, AtlassianFolderNode[]>(),
  ): Promise<AtlassianFolderNode[]> {
    if (cache.has(parentId)) {
      return cache.get(parentId)!;
    }

    const path = (await this.getFolderChain(Number(parentId))).reverse();
    cache.set(parentId, path);
    return path;
  }

  private async buildFolderPersistenceInput(
    folderId: string,
    folderPathCache: Map<string, AtlassianFolderNode[]>,
    syncedAt: Date,
  ) {
    const folder = (await this.getFolderById(Number(folderId))) as AtlassianFolderSummary;
    const folderPath = await this.getFolderPath(folderId, folderPathCache);

    return {
      atlassianId: folder.id,
      title: folder.title,
      type: folder.type,
      parentId: folder.parentId ?? undefined,
      parentType: folder.parentType ?? undefined,
      spaceId: folder.spaceId,
      status: folder.status,
      webui: this.resolveApiUrl(folder._links?.webui),
      sourceCreatedAt: this.parseIsoDate(folder.createdAt),
      versionNumber: folder.version?.number,
      versionCreatedAt: this.parseIsoDate(folder.version?.createdAt),
      folderPath,
      lastFolderSyncAt: syncedAt,
    };
  }

  private resolveApiUrl(path?: string): string | undefined {
    if (!path) {
      return undefined;
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const baseUrl = this.getUrl();
    if (!baseUrl) {
      return undefined;
    }

    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private extractNextPageUrl(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return undefined;
    }

    const record = payload as Record<string, unknown>;
    const topLevelNext =
      typeof record.next === 'string' ? record.next : undefined;

    if (topLevelNext) {
      return this.resolveApiUrl(topLevelNext);
    }

    const links =
      record._links && typeof record._links === 'object' && !Array.isArray(record._links)
        ? (record._links as Record<string, unknown>)
        : undefined;
    const nestedNext = links && typeof links.next === 'string'
      ? links.next
      : undefined;

    return this.resolveApiUrl(nestedNext);
  }

  private parseIsoDate(value?: string): Date | undefined {
    return value ? new Date(value) : undefined;
  }

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
}
