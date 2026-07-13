import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AtlassianContent,
  AtlassianContentDocument,
} from '../atlassian/atlassian-content.schema';
import { AtlassianFolderNode } from '../atlassian/atlassian.interfaces';
import { AtlassianServiceV2 } from '../atlassian/atlassianV2.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ContentActivity,
  ContentActivityDocument,
  ContentInteraction,
  ContentInteractionDocument,
  ContentSyncRun,
  ContentSyncRunDocument,
  ContentVersion,
  ContentVersionDocument,
} from './content.schemas';

type ContentType = 'page' | 'blog' | 'doc';

type FeedQuery = {
  limit: number;
  page: number;
  sort?: string;
  space?: string;
  type?: string;
  tags: string[];
  unread: boolean;
};

type SearchQuery = {
  query: string;
  space?: string;
  type?: string;
  tags: string[];
};

type StoredContentRecord = AtlassianContent & {
  createdAt?: Date;
  updatedAt?: Date;
};

type InteractionRecord = ContentInteraction & {
  createdAt?: Date;
  updatedAt?: Date;
};

type NormalizedContentItem = {
  id: string;
  title: string;
  excerpt: string;
  type: ContentType;
  tags: string[];
  body: string;
  bodyHtml?: string;
  bodyText: string;
  bodyFormat: 'html' | 'text';
  readTimeMinutes: number;
  space: {
    key: string;
    name: string;
  };
  author: {
    name: string;
    initials: string;
  };
  webUrl?: string;
  lastUpdatedAt?: string;
  createdAt?: string;
  syncedAt?: string;
  versionNumber?: number;
  starred: boolean;
  unread: boolean;
  views: number;
  readAt?: string;
  syncSource: 'atlassian' | 'local-copy';
  originContentId?: string;
};

type SyncRunShape = {
  scope: 'bulk' | 'single-page' | 'folders' | 'pages';
  trigger: 'manual' | 'cron';
  status: 'success' | 'error' | 'skipped';
  processed: number;
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  failures: Array<{ pageId?: string; itemId?: string; message: string }>;
  contentId?: string;
};

type SyncContentResult = {
  content: AtlassianContentDocument;
  outcome: 'added' | 'updated' | 'skipped' | 'error';
  startedAt: Date;
  finishedAt: Date;
  error?: string;
};

@Injectable()
export class ContentService {
  constructor(
    private readonly atlassianService: AtlassianServiceV2,
    private readonly notificationsService: NotificationsService,
    @InjectModel(AtlassianContent.name)
    private readonly atlassianContentModel: Model<AtlassianContentDocument>,
    @InjectModel(ContentInteraction.name)
    private readonly interactionModel: Model<ContentInteractionDocument>,
    @InjectModel(ContentVersion.name)
    private readonly versionModel: Model<ContentVersionDocument>,
    @InjectModel(ContentSyncRun.name)
    private readonly syncRunModel: Model<ContentSyncRunDocument>,
    @InjectModel(ContentActivity.name)
    private readonly activityModel: Model<ContentActivityDocument>,
  ) {}

  async listAllContent() {
    const feed = await this.getFeeds({
      page: 1,
      limit: 200,
      tags: [],
      unread: false,
    });

    return feed.items;
  }

  async createLocalContent(payload: {
    body?: string;
    topicId?: string;
    title?: string;
  }) {
    const nextId = payload.topicId?.trim() || `local-${randomUUID()}`;
    const title = payload.title?.trim() || 'Untitled draft';
    const now = new Date();
    const document = await this.atlassianContentModel.create({
      atlassianId: nextId,
      title,
      body: payload.body ?? '',
      bodyRepresentation: 'storage',
      versionNumber: 1,
      status: 'draft',
      syncSource: 'local-copy',
      lastContentSyncAt: now,
      sourceCreatedAt: now,
      versionCreatedAt: now,
    });

    await this.ensureVersionSnapshot(document, now, 'Workspace draft');

    return {
      ...(await this.getContentDetail(document.atlassianId)),
      topicId: document.atlassianId,
    };
  }

  async updateLocalContent(
    id: string,
    payload: {
      body?: string;
      title?: string;
    },
  ) {
    const existing = await this.findContentRecord(id);
    const now = new Date();
    const nextVersion = (existing.versionNumber ?? 0) + 1;

    const updated = await this.atlassianContentModel
      .findOneAndUpdate(
        { atlassianId: id },
        {
          $set: {
            body: payload.body ?? existing.body ?? '',
            title: payload.title?.trim() || existing.title,
            versionNumber: nextVersion,
            versionCreatedAt: now,
            lastContentSyncAt: now,
            syncSource: existing.syncSource ?? 'local-copy',
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Content ${id} was not found`);
    }

    await this.ensureVersionSnapshot(updated, now, 'Workspace');
    await this.logActivity('sync', id, {
      source: 'local-update',
      versionNumber: updated.versionNumber ?? nextVersion,
    });

    return {
      ...(await this.getContentDetail(id)),
      topicId: id,
    };
  }

  async getFeeds(query: FeedQuery) {
    const allItems = await this.loadNormalizedContent();
    const matchingItems = this.applyFeedFilters(allItems, query);
    const total = matchingItems.length;
    const page = Math.max(query.page, 1);
    const limit = this.normalizeLimit(query.limit);
    const startIndex = (page - 1) * limit;
    const items = matchingItems.slice(startIndex, startIndex + limit);

    return {
      items,
      page,
      limit,
      total,
      hasMore: startIndex + items.length < total,
      availableTags: this.extractAvailableTags(matchingItems),
    };
  }

  async getRecent() {
    const readActivities = await this.activityModel
      .find({ action: 'read' })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const items = await this.loadNormalizedContent();
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const seen = new Set<string>();
    const recentItems: NormalizedContentItem[] = [];

    for (const activity of readActivities) {
      if (!activity.contentId || seen.has(activity.contentId)) {
        continue;
      }

      const content = itemMap.get(activity.contentId);
      if (!content) {
        continue;
      }

      seen.add(activity.contentId);
      recentItems.push({
        ...content,
        readAt: activity.createdAt?.toISOString() ?? content.readAt,
      });
    }

    return {
      items: recentItems,
      total: recentItems.length,
    };
  }

  async getStarred() {
    const items = (await this.loadNormalizedContent()).filter((item) => item.starred);

    return {
      items,
      total: items.length,
    };
  }

  async searchContent(query: SearchQuery) {
    const normalizedQuery = query.query.trim().toLowerCase();
    const items = this.applyFeedFilters(await this.loadNormalizedContent(), {
      page: 1,
      limit: 500,
      sort: 'recent',
      unread: false,
      space: query.space,
      type: query.type,
      tags: query.tags,
    }).filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        item.title,
        item.excerpt,
        item.bodyText,
        item.space.name,
        item.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    const grouped = {
      pages: items.filter((item) => item.type === 'page'),
      blogs: items.filter((item) => item.type === 'blog'),
      docs: items.filter((item) => item.type === 'doc'),
    };

    return {
      items,
      total: items.length,
      grouped,
    };
  }

  async getContentDetail(id: string) {
    const item = (await this.loadNormalizedContent()).find((entry) => entry.id === id);

    if (!item) {
      throw new NotFoundException(`Content ${id} was not found`);
    }

    return {
      ...item,
      body: item.bodyFormat === 'html' ? item.bodyHtml : item.bodyText,
      sync: {
        syncedAt: item.syncedAt,
        atlassianVersion: item.versionNumber ?? null,
        source: item.syncSource,
        originContentId: item.originContentId ?? null,
      },
    };
  }

  async getVersionHistory(id: string) {
    await this.findContentRecord(id);

    const versions = await this.versionModel
      .find({ contentId: id })
      .sort({ versionNumber: -1, changedAt: -1 })
      .lean()
      .exec();

    if (versions.length > 0) {
      return {
        items: versions.map((version) => ({
          id: `${version.contentId}-${version.versionNumber}`,
          versionNumber: version.versionNumber,
          title: version.title,
          changeSummary: version.changeSummary ?? 'Version snapshot captured during sync',
          changedBy: version.changedBy ?? 'Atlassian Sync',
          changedAt:
            version.changedAt?.toISOString() ??
            version.syncedAt?.toISOString() ??
            version.createdAt?.toISOString(),
          body: version.body ?? '',
        })),
      };
    }

    const current = await this.getContentDetail(id);
    return {
      items: [
        {
          id: `${id}-${current.versionNumber ?? 1}`,
          versionNumber: current.versionNumber ?? 1,
          title: current.title,
          changeSummary: 'Current stored version',
          changedBy: current.author.name,
          changedAt: current.lastUpdatedAt ?? current.syncedAt ?? current.createdAt,
          body: current.bodyText,
        },
      ],
    };
  }

  async getSpaces() {
    const items = await this.loadNormalizedContent();
    const spaceMap = new Map<
      string,
      {
        key: string;
        name: string;
        itemCount: number;
        unreadCount: number;
        starredCount: number;
        lastSyncedAt?: string;
      }
    >();

    items.forEach((item) => {
      const existing = spaceMap.get(item.space.key) ?? {
        key: item.space.key,
        name: item.space.name,
        itemCount: 0,
        unreadCount: 0,
        starredCount: 0,
        lastSyncedAt: item.syncedAt,
      };

      existing.itemCount += 1;
      existing.unreadCount += item.unread ? 1 : 0;
      existing.starredCount += item.starred ? 1 : 0;
      existing.lastSyncedAt =
        this.pickLatestIso(existing.lastSyncedAt, item.syncedAt) ?? existing.lastSyncedAt;
      spaceMap.set(item.space.key, existing);
    });

    return {
      items: Array.from(spaceMap.values()).sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
      ),
      total: spaceMap.size,
    };
  }

  async markAsRead(id: string) {
    const content = await this.findContentRecord(id);
    const now = new Date();

    await this.interactionModel
      .findOneAndUpdate(
        { contentId: id },
        {
          $set: { lastReadAt: now },
          $inc: { viewCount: 1 },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    await this.logActivity('read', id, {
      versionNumber: content.versionNumber ?? 0,
    });

    return {
      success: true,
      contentId: id,
      readAt: now.toISOString(),
    };
  }

  async setStarred(id: string, starred: boolean) {
    await this.findContentRecord(id);
    const now = new Date();

    const interaction = await this.interactionModel
      .findOneAndUpdate(
        { contentId: id },
        {
          $set: {
            starred,
            starredAt: starred ? now : null,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    await this.logActivity(starred ? 'star' : 'unstar', id, {
      starredAt: interaction?.starredAt?.toISOString() ?? null,
    });

    return {
      success: true,
      contentId: id,
      starred,
      starredAt: interaction?.starredAt?.toISOString() ?? null,
    };
  }

  async duplicateContent(id: string) {
    const existing = await this.findContentRecord(id);
    const now = new Date();
    const duplicateId = `local-${randomUUID()}`;
    const duplicate = await this.atlassianContentModel.create({
      atlassianId: duplicateId,
      title: `${existing.title} (Copy)`,
      body: existing.body ?? '',
      bodyRepresentation: existing.bodyRepresentation ?? 'storage',
      atlasDocFormat: existing.atlasDocFormat,
      versionNumber: 1,
      status: existing.status ?? 'draft',
      spaceId: existing.spaceId,
      webui: existing.webui,
      editui: existing.editui,
      edituiv2: existing.edituiv2,
      tinyui: existing.tinyui,
      folderPath: existing.folderPath ?? [],
      sourceCreatedAt: now,
      versionCreatedAt: now,
      lastContentSyncAt: now,
      syncSource: 'local-copy',
      originContentId: id,
      authorName: existing.authorName ?? 'Workspace',
    });

    await this.interactionModel
      .findOneAndUpdate(
        { contentId: id },
        { $inc: { duplicateCount: 1 } },
        {
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    await this.ensureVersionSnapshot(duplicate, now, 'Workspace');
    await this.logActivity('duplicate', duplicateId, {
      originContentId: id,
    });

    return this.getContentDetail(duplicateId);
  }

  async syncContent(id: string) {
    const synced = (await this.atlassianService.syncStoredContentByAtlassianId(
      id,
    )) as SyncContentResult;
    const now = new Date();
    const run = await this.persistSyncRun({
      scope: 'single-page',
      trigger: 'manual',
      status: synced.outcome === 'error' ? 'error' : 'success',
      processed: 1,
      added: synced.outcome === 'added' ? 1 : 0,
      updated: synced.outcome === 'updated' ? 1 : 0,
      skipped: synced.outcome === 'skipped' ? 1 : 0,
      failed: synced.outcome === 'error' ? 1 : 0,
      startedAt: synced.startedAt ?? now,
      finishedAt: synced.finishedAt ?? now,
      durationMs:
        (synced.finishedAt?.getTime() ?? now.getTime()) -
        (synced.startedAt?.getTime() ?? now.getTime()),
      failures: synced.error
        ? [{ itemId: id, message: synced.error }]
        : [],
      contentId: id,
    });

    await this.logActivity('sync', id, {
      outcome: synced.outcome,
      syncRunId: String(run._id),
    });

    return {
      ...(await this.getContentDetail(id)),
      syncRunId: String(run._id),
      outcome: synced.outcome,
    };
  }

  async runBulkSync() {
    const startedAt = new Date();
    const [folderResult, pageResult] = await Promise.all([
      this.atlassianService.triggerFolderSync(),
      this.atlassianService.triggerPageContentSync(),
    ]);
    const finishedAt = new Date();

    const folderSummary =
      'inserted' in folderResult
        ? {
            processed: folderResult.discovered,
            added: folderResult.inserted,
            skipped: folderResult.skippedExisting,
            failed: 0,
          }
        : {
            processed: 0,
            added: 0,
            skipped: 1,
            failed: 0,
          };

    const pageSummary =
      'processed' in pageResult
        ? {
            processed: pageResult.processed,
            added: pageResult.added ?? 0,
            updated: pageResult.updated ?? 0,
            skipped: pageResult.skipped ?? 0,
            failed: pageResult.failed,
            failures: pageResult.failures ?? [],
          }
        : {
            processed: 0,
            added: 0,
            updated: 0,
            skipped: 1,
            failed: 0,
            failures: [],
          };

    const run = await this.persistSyncRun({
      scope: 'bulk',
      trigger: 'manual',
      status: pageSummary.failed > 0 ? 'error' : 'success',
      processed: folderSummary.processed + pageSummary.processed,
      added: folderSummary.added + pageSummary.added,
      updated: pageSummary.updated,
      skipped: folderSummary.skipped + pageSummary.skipped,
      failed: folderSummary.failed + pageSummary.failed,
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      failures: pageSummary.failures,
    });

    this.notificationsService.publishSuccess({
      service: 'content',
      event: 'content.bulk-sync.completed',
      message: 'Content sync finished successfully',
      data: {
        processed: folderSummary.processed + pageSummary.processed,
        added: folderSummary.added + pageSummary.added,
        updated: pageSummary.updated,
        skipped: folderSummary.skipped + pageSummary.skipped,
        failed: folderSummary.failed + pageSummary.failed,
      },
    });

    return {
      syncRunId: String(run._id),
      folderResult,
      pageResult,
      syncStatus: await this.getSyncStatus(),
    };
  }

  async getSyncStatus() {
    const [recentRuns, spaces, runtime] = await Promise.all([
      this.syncRunModel.find().sort({ finishedAt: -1 }).limit(5).lean().exec(),
      this.getSpaces(),
      Promise.resolve(this.atlassianService.getSyncRuntimeState()),
    ]);
    const lastRun = recentRuns[0];
    const nextHour = new Date();
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);

    return {
      isSyncRunning: runtime.isContentSyncRunning || runtime.isFolderSyncRunning,
      lastSyncAt: lastRun?.finishedAt?.toISOString() ?? null,
      lastSyncDurationMs: lastRun?.durationMs ?? 0,
      nextScheduledSyncAt: nextHour.toISOString(),
      scheduleLabel: 'Page sync hourly / folder sync daily at midnight',
      spacesConnected: spaces.total,
      stats: {
        added: lastRun?.added ?? 0,
        updated: lastRun?.updated ?? 0,
        skipped: lastRun?.skipped ?? 0,
        errors: lastRun?.failed ?? 0,
      },
      liveRuns: recentRuns.map((run) => ({
        id: String(run._id),
        scope: run.scope,
        status: run.status,
        processed: run.processed,
        added: run.added,
        updated: run.updated,
        skipped: run.skipped,
        failed: run.failed,
        startedAt: run.startedAt?.toISOString(),
        finishedAt: run.finishedAt?.toISOString(),
        durationMs: run.durationMs,
        failures: run.failures ?? [],
      })),
      nextFolderSyncAt: nextMidnight.toISOString(),
    };
  }

  async getAnalytics() {
    const [items, activities, syncRuns, spaces] = await Promise.all([
      this.loadNormalizedContent(),
      this.activityModel.find().lean().exec(),
      this.syncRunModel.find().sort({ finishedAt: -1 }).limit(10).lean().exec(),
      this.getSpaces(),
    ]);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const readActivities = activities.filter((activity) => activity.action === 'read');
    const viewsThisWeek = readActivities.filter((activity) => {
      const createdAt = activity.createdAt ? new Date(activity.createdAt) : null;
      return createdAt ? createdAt >= weekStart : false;
    }).length;

    const typeBreakdown = (['page', 'blog', 'doc'] as ContentType[]).map((type) => ({
      type,
      count: items.filter((item) => item.type === type).length,
    }));

    const topContent = [...items]
      .sort((left, right) => {
        if (right.views !== left.views) {
          return right.views - left.views;
        }

        return Number(right.starred) - Number(left.starred);
      })
      .slice(0, 8)
      .map((item, index) => ({
        rank: index + 1,
        id: item.id,
        title: item.title,
        space: item.space.name,
        type: item.type,
        views: item.views,
        stars: item.starred ? 1 : 0,
      }));

    return {
      summary: {
        totalContent: items.length,
        viewsThisWeek,
        totalStarred: items.filter((item) => item.starred).length,
        spacesConnected: spaces.total,
      },
      activityHeatmap: this.buildHeatmap(activities),
      topContent,
      contentByType: typeBreakdown,
      syncHistory: syncRuns.map((run) => ({
        id: String(run._id),
        scope: run.scope,
        status: run.status,
        processed: run.processed,
        added: run.added,
        updated: run.updated,
        skipped: run.skipped,
        failed: run.failed,
        startedAt: run.startedAt?.toISOString(),
        finishedAt: run.finishedAt?.toISOString(),
        durationMs: run.durationMs,
      })),
      syncStatus: await this.getSyncStatus(),
    };
  }

  private async loadNormalizedContent(): Promise<NormalizedContentItem[]> {
    const [records, interactions] = await Promise.all([
      this.atlassianContentModel.find().lean().exec(),
      this.interactionModel.find().lean().exec(),
    ]);
    const interactionMap = new Map(
      interactions.map((interaction) => [interaction.contentId, interaction]),
    );

    return records
      .map((record) =>
        this.toNormalizedContent(record as unknown as StoredContentRecord, interactionMap.get(record.atlassianId)),
      )
      .sort((left, right) => {
        const leftValue = new Date(left.lastUpdatedAt ?? left.createdAt ?? 0).getTime();
        const rightValue = new Date(right.lastUpdatedAt ?? right.createdAt ?? 0).getTime();
        return rightValue - leftValue;
      });
  }

  private toNormalizedContent(
    record: StoredContentRecord,
    interaction?: InteractionRecord,
  ): NormalizedContentItem {
    const bodyText = this.extractTextFromBody(record.body);
    const bodyHtml = this.looksLikeHtml(record.body) ? record.body : undefined;
    const type = this.resolveContentType(record);
    const space = this.resolveSpace(record);
    const authorName = record.authorName?.trim() || 'Atlassian Sync';

    return {
      id: record.atlassianId,
      title: record.title,
      excerpt: this.buildExcerpt(bodyText),
      type,
      tags: this.buildTags(record, type),
      body: record.body ?? '',
      bodyHtml,
      bodyText,
      bodyFormat: bodyHtml ? 'html' : 'text',
      readTimeMinutes: this.calculateReadTime(bodyText),
      space,
      author: {
        name: authorName,
        initials: this.buildInitials(authorName),
      },
      webUrl: record.webui,
      lastUpdatedAt: this.toIso(record.versionCreatedAt ?? record.updatedAt),
      createdAt: this.toIso(record.sourceCreatedAt ?? record.createdAt),
      syncedAt: this.toIso(record.lastContentSyncAt),
      versionNumber: record.versionNumber,
      starred: interaction?.starred ?? false,
      unread: !interaction?.lastReadAt,
      views: interaction?.viewCount ?? 0,
      readAt: this.toIso(interaction?.lastReadAt),
      syncSource: record.syncSource === 'local-copy' ? 'local-copy' : 'atlassian',
      originContentId: record.originContentId,
    };
  }

  private applyFeedFilters(items: NormalizedContentItem[], query: FeedQuery) {
    const normalizedType = query.type?.trim().toLowerCase();
    const normalizedSpace = query.space?.trim().toLowerCase();
    const normalizedTags = query.tags.map((tag) => tag.toLowerCase());

    const filtered = items.filter((item) => {
      if (query.unread && !item.unread) {
        return false;
      }

      if (normalizedType && normalizedType !== 'all' && item.type !== normalizedType) {
        return false;
      }

      if (
        normalizedSpace &&
        item.space.key.toLowerCase() !== normalizedSpace &&
        item.space.name.toLowerCase() !== normalizedSpace
      ) {
        return false;
      }

      if (
        normalizedTags.length > 0 &&
        !normalizedTags.every((tag) => item.tags.includes(tag))
      ) {
        return false;
      }

      return true;
    });

    return filtered.sort((left, right) => this.sortItems(left, right, query.sort));
  }

  private sortItems(
    left: NormalizedContentItem,
    right: NormalizedContentItem,
    sort?: string,
  ) {
    switch ((sort ?? 'recent').toLowerCase()) {
      case 'popular':
        return (
          right.views +
          Number(right.starred) -
          (left.views + Number(left.starred))
        );
      case 'updated':
        return (
          new Date(right.lastUpdatedAt ?? 0).getTime() -
          new Date(left.lastUpdatedAt ?? 0).getTime()
        );
      default:
        return (
          new Date(right.createdAt ?? right.lastUpdatedAt ?? 0).getTime() -
          new Date(left.createdAt ?? left.lastUpdatedAt ?? 0).getTime()
        );
    }
  }

  private extractAvailableTags(items: NormalizedContentItem[]) {
    return Array.from(
      new Set(items.flatMap((item) => item.tags)),
    ).sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
    );
  }

  private buildHeatmap(activities: Array<ContentActivity & { createdAt?: Date }>) {
    const start = new Date();
    start.setDate(start.getDate() - 364);
    start.setHours(0, 0, 0, 0);
    const counts = new Map<string, number>();

    activities.forEach((activity) => {
      const createdAt = activity.createdAt ? new Date(activity.createdAt) : null;
      if (!createdAt || createdAt < start) {
        return;
      }

      const key = createdAt.toISOString().split('T')[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from({ length: 365 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = date.toISOString().split('T')[0];

      return {
        date: key,
        count: counts.get(key) ?? 0,
      };
    });
  }

  private resolveContentType(record: StoredContentRecord): ContentType {
    const keywords = [
      record.title,
      record.spaceId,
      ...(record.folderPath ?? []).map((node) => node.label),
    ]
      .join(' ')
      .toLowerCase();

    if (keywords.includes('blog')) {
      return 'blog';
    }

    if (
      keywords.includes('doc') ||
      keywords.includes('guide') ||
      keywords.includes('reference')
    ) {
      return 'doc';
    }

    return 'page';
  }

  private resolveSpace(record: StoredContentRecord) {
    const rootFolder = record.folderPath?.[0];
    const name = rootFolder?.label?.trim() || record.spaceId?.trim() || 'Workspace';
    return {
      key: this.slugify(rootFolder?.id || record.spaceId || name),
      name,
    };
  }

  private buildTags(record: StoredContentRecord, type: ContentType) {
    const tags = new Set<string>();
    tags.add(type);

    (record.folderPath ?? []).forEach((node) => {
      const normalized = this.slugify(node.label);
      if (normalized && normalized !== this.slugify(record.spaceId ?? '')) {
        tags.add(normalized);
      }
    });

    return Array.from(tags).slice(0, 6);
  }

  private extractTextFromBody(body?: string) {
    if (!body) {
      return '';
    }

    if (this.looksLikeHtml(body)) {
      return body
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const parsedJson = this.tryParseJson(body);
    if (parsedJson) {
      return this.collectAdfText(parsedJson).replace(/\s+/g, ' ').trim();
    }

    return body.replace(/\s+/g, ' ').trim();
  }

  private collectAdfText(value: unknown): string {
    if (!value || typeof value !== 'object') {
      return '';
    }

    const record = value as Record<string, unknown>;
    const chunks: string[] = [];

    if (typeof record['text'] === 'string') {
      chunks.push(record['text']);
    }

    if (Array.isArray(record['content'])) {
      for (const child of record['content']) {
        const text = this.collectAdfText(child);
        if (text) {
          chunks.push(text);
        }
      }
    }

    return chunks.join(' ');
  }

  private buildExcerpt(text: string, maxLength = 180) {
    if (!text) {
      return 'No summary is available for this item yet.';
    }

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength).trimEnd()}...`;
  }

  private looksLikeHtml(value?: string) {
    return typeof value === 'string' && /<[^>]+>/.test(value);
  }

  private tryParseJson(value: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private calculateReadTime(text: string) {
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 220));
  }

  private buildInitials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk.charAt(0).toUpperCase())
      .join('');
  }

  private normalizeLimit(limit: number) {
    return Math.min(Math.max(limit, 1), 50);
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toIso(value?: Date | string | null) {
    if (!value) {
      return undefined;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  private pickLatestIso(left?: string, right?: string) {
    if (!left) {
      return right;
    }

    if (!right) {
      return left;
    }

    return new Date(right) > new Date(left) ? right : left;
  }

  private async findContentRecord(id: string) {
    const record = await this.atlassianContentModel
      .findOne({ atlassianId: id })
      .exec();

    if (!record) {
      throw new NotFoundException(`Content ${id} was not found`);
    }

    return record;
  }

  private async ensureVersionSnapshot(
    document: AtlassianContentDocument | StoredContentRecord,
    syncedAt: Date,
    changedBy?: string,
  ) {
    const versionNumber = document.versionNumber ?? 1;
    await this.versionModel
      .updateOne(
        {
          contentId: document.atlassianId,
          versionNumber,
        },
        {
          $setOnInsert: {
            contentId: document.atlassianId,
            versionNumber,
            title: document.title,
            body: document.body ?? '',
            changeSummary: 'Snapshot captured from synced content',
            changedBy: changedBy ?? document.authorName ?? 'Atlassian Sync',
            changedAt: document.versionCreatedAt ?? document.updatedAt ?? syncedAt,
            syncedAt,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  private async persistSyncRun(run: SyncRunShape) {
    return this.syncRunModel.create(run);
  }

  private async logActivity(
    action: ContentActivity['action'],
    contentId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.activityModel.create({
      action,
      contentId,
      metadata,
    });
  }
}
