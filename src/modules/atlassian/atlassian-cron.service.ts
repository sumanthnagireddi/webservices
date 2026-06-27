import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosInstance } from 'axios';

// ─────────────────────────────────────────────
// MONGOOSE SCHEMAS (inline for single-file reference)
// ─────────────────────────────────────────────

export interface ConfluencePage {
  confluenceId: string;
  type: 'page' | 'blogpost';
  title: string;
  spaceKey: string;
  status: 'current' | 'trashed' | 'deleted';
  parentId: string | null;
  ancestorIds: string[];
  body: string;
  version: number;
  versionBy: string;
  createdAt: Date;
  modifiedAt: Date;
  deletedAt?: Date;
  syncedAt: Date;
}

export interface ConfluenceFolder {
  confluenceId: string; // space key or page-as-folder id
  type: 'space' | 'folder';
  title: string;
  spaceKey: string;
  parentId: string | null;
  status: 'active' | 'archived' | 'deleted';
  children: string[];
  movedFrom?: string | null;
  modifiedAt: Date;
  deletedAt?: Date;
  syncedAt: Date;
}

export interface SyncMeta {
  _id: string;
  lastFullSyncAt: Date | null;
  lastIncrementalSyncAt: Date | null;
  lastRunStatus: 'success' | 'failed' | 'partial';
  lastRunError?: string;
  totalPagesSynced: number;
  totalFoldersSynced: number;
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type ChangeType = 'created' | 'updated' | 'deleted' | 'moved' | 'archived';

interface ConfluenceApiPage {
  id: string;
  type: string;
  title: string;
  status: string;
  space: { key: string };
  version: { number: number; when: string; by: { displayName: string } };
  ancestors: Array<{ id: string }>;
  children?: { page?: { results: Array<{ id: string }> } };
  body?: { storage: { value: string } };
}

interface ConfluenceApiSpace {
  key: string;
  name: string;
  type: string;
  status: string;
}

interface ChangeResult {
  changeType: ChangeType;
  entityType: 'page' | 'folder' | 'space';
  id: string;
  title: string;
}

@Injectable()
export class ConfluenceSyncCron implements OnModuleInit {
  private readonly logger = new Logger(ConfluenceSyncCron.name);
  private readonly http: AxiosInstance;
  private readonly BATCH_SIZE = 50;
  private readonly SYNC_META_ID = 'confluence_sync_meta';
  private enabled = true;
  private allowedSpaces: string[] | null = null;

  constructor(
    @InjectModel('ConfluencePage') private pageModel: Model<ConfluencePage>,
    @InjectModel('ConfluenceFolder') private folderModel: Model<ConfluenceFolder>,
    @InjectModel('SyncMeta') private syncMetaModel: Model<SyncMeta>,
  ) {
    const baseURL = process.env.CONFLUENCE_BASE_URL ?? process.env.ATLASSIAN_SITE_URL ?? process.env.ATLASSIAN_URL;
    const email = process.env.CONFLUENCE_EMAIL ?? process.env.ATLASSIAN_EMAIL;
    const token = process.env.CONFLUENCE_API_TOKEN ?? process.env.ATLASSIAN_API_KEY;

    // Restrict sync to Sumanth's space only (hard-coded). Can be overridden by env.
    const spaceList = process.env.CONFLUENCE_SYNC_SPACES ?? process.env.ATLASSIAN_SYNC_SPACES ?? process.env.CONFLUENCE_SPACE_KEY;
    this.allowedSpaces = spaceList ? spaceList.split(',').map((s) => s.trim()).filter(Boolean) : ['~712020ee5617697c9048f0ad47c93d292f605d'];

    if (!baseURL) {
      this.logger.warn('Confluence base URL not configured; disabling sync. Set CONFLUENCE_BASE_URL or ATLASSIAN_SITE_URL.');
      this.enabled = false;
      this.http = axios.create();
      return;
    }

    if (!email || !token) {
      this.logger.warn('Confluence credentials not configured; disabling sync. Set CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN (or ATLASSIAN_EMAIL / ATLASSIAN_API_KEY).');
      this.enabled = false;
      this.http = axios.create({ baseURL });
      return;
    }

    this.http = axios.create({
      baseURL,
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
        Accept: 'application/json',
      },
      timeout: 30_000,
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('ConfluenceSyncCron initialized — scheduling initial sync in 2 minutes');
    // Schedule initial incremental sync 2 minutes after server start
    setTimeout(() => {
      this.incrementalSync().catch((err) => this.logger.error('Initial delayed sync failed', err?.message ?? err));
    }, 0.5 * 60 * 1000);
  }

  // Recurring incremental sync: weekly (Sunday 00:00)
  @Cron('0 0 * * 0')
  async incrementalSync() {
    if (!this.enabled) {
      this.logger.warn('Confluence sync disabled; skipping incremental sync.');
      return [] as ChangeResult[];
    }
    this.logger.log('⏱  Incremental sync started');
    const meta = await this.getOrCreateSyncMeta();

    if (!meta.lastFullSyncAt) {
      this.logger.warn('No full sync found. Triggering full sync first.');
      await this.fullSync();
      return;
    }

    await this.runSync(meta.lastIncrementalSyncAt ?? meta.lastFullSyncAt, false);
  }

  @Cron('0 0 * * 0')
  async fullSync() {
    this.logger.log('🔄  Full sync started');
    await this.runSync(new Date(0), true);
  }

  private async runSync(since: Date, isFull: boolean) {
    const syncStart = new Date();
    const changes: ChangeResult[] = [];

    try {
      const spaceChanges = await this.syncSpaces();
      changes.push(...spaceChanges);

      const pageChanges = await this.syncModifiedPages(since);
      changes.push(...pageChanges);

      const deletedChanges = await this.syncTrashedPages(since);
      changes.push(...deletedChanges);

      const movedChanges = await this.syncMovedPages(since);
      changes.push(...movedChanges);

      const folderChanges = await this.syncFolders(since);
      changes.push(...folderChanges);

      if (isFull) {
        await this.reconcileOrphanedDocs();
      }

      await this.updateSyncMeta(syncStart, isFull, 'success', changes);

      this.logger.log(`✅ Sync complete. ${changes.length} changes processed.`);
      this.logChangeSummary(changes);
    } catch (err: any) {
      this.logger.error('❌ Sync failed', err);
      await this.updateSyncMeta(syncStart, isFull, 'failed', [], err.message);
    }
  }

  private async syncSpaces(): Promise<ChangeResult[]> {
    this.logger.log('📁  Syncing spaces...');
    const changes: ChangeResult[] = [];
    let spaces: ConfluenceApiSpace[] = [];

    if (this.allowedSpaces && this.allowedSpaces.length) {
      for (const key of this.allowedSpaces) {
        try {
          const res = await this.http.get(`/wiki/rest/api/space/${encodeURIComponent(key)}`, { params: { expand: 'description,homepage' } });
          spaces.push(res.data as ConfluenceApiSpace);
        } catch (err: any) {
          this.logger.warn(`Failed to fetch space ${key}: ${err?.message ?? err}`);
        }
      }
    } else {
      spaces = await this.paginateAll<ConfluenceApiSpace>('/wiki/rest/api/space', { type: 'global', status: 'current', expand: 'description,homepage' });
    }

    for (const space of spaces) {
      const existing = await this.folderModel.findOne({ confluenceId: space.key, type: 'space' });
      const isNew = !existing;

      await this.folderModel.findOneAndUpdate(
        { confluenceId: space.key, type: 'space' },
        {
          $set: {
            confluenceId: space.key,
            type: 'space',
            title: space.name,
            spaceKey: space.key,
            parentId: null,
            status: space.status === 'archived' ? 'archived' : 'active',
            syncedAt: new Date(),
          },
        },
        { upsert: true, returnDocument: 'after' as any },
      );

      changes.push({ changeType: isNew ? 'created' : 'updated', entityType: 'space', id: space.key, title: space.name });
    }

    const apiSpaceKeys = spaces.map((s) => s.key);
    const dbSpaces = await this.folderModel.find({ type: 'space', status: 'active' });
    for (const dbSpace of dbSpaces) {
      if (!apiSpaceKeys.includes(dbSpace.confluenceId)) {
        await this.folderModel.updateOne({ confluenceId: dbSpace.confluenceId }, { $set: { status: 'archived', syncedAt: new Date() } });
        changes.push({ changeType: 'archived', entityType: 'space', id: dbSpace.confluenceId, title: dbSpace.title });
      }
    }

    return changes;
  }

  private async syncModifiedPages(since: Date): Promise<ChangeResult[]> {
    this.logger.log('📄  Syncing modified pages...');
    const changes: ChangeResult[] = [];
    const sinceIso = since.toISOString().replace('T', ' ').substring(0, 16);
    const spaceFilter = this.allowedSpaces && this.allowedSpaces.length ? `space in (${this.allowedSpaces.map((s) => `"${s}"`).join(',')}) AND ` : '';
    const cql = `${spaceFilter}lastModified > "${sinceIso}" AND type IN ("page","blogpost")`;
    const pages = await this.paginateAllCql(cql, 'body.storage,version,ancestors,space');

    for (const page of pages) {
      const existing = await this.pageModel.findOne({ confluenceId: page.id });
      const changeType: ChangeType = !existing ? 'created' : 'updated';

      await this.pageModel.findOneAndUpdate(
        { confluenceId: page.id },
        {
          $set: {
            confluenceId: page.id,
            type: page.type as 'page' | 'blogpost',
            title: page.title,
            spaceKey: page.space.key,
            status: 'current',
            parentId: page.ancestors?.at(-1)?.id ?? null,
            ancestorIds: (page.ancestors ?? []).map((a) => a.id),
            body: page.body?.storage?.value ?? '',
            version: page.version.number,
            versionBy: page.version.by?.displayName ?? 'unknown',
            modifiedAt: new Date(page.version.when),
            syncedAt: new Date(),
            ...(changeType === 'created' && { createdAt: new Date(page.version.when) }),
          },
        },
        { upsert: true, returnDocument: 'after' as any },
      );

      changes.push({ changeType, entityType: 'page', id: page.id, title: page.title });
    }

    return changes;
  }

  private async syncTrashedPages(since: Date): Promise<ChangeResult[]> {
    this.logger.log('🗑️  Syncing trashed pages...');
    const changes: ChangeResult[] = [];
    const sinceIso = since.toISOString().replace('T', ' ').substring(0, 16);
    const spaceFilter = this.allowedSpaces && this.allowedSpaces.length ? `space in (${this.allowedSpaces.map((s) => `"${s}"`).join(',')}) AND ` : '';
    const cql = `${spaceFilter}lastModified > "${sinceIso}" AND type IN ("page","blogpost")`;

    try {
      const pages = await this.paginateAllCql(cql, 'version,space', 'trashed');

      for (const page of pages) {
        await this.pageModel.findOneAndUpdate(
          { confluenceId: page.id },
          { $set: { status: 'trashed', deletedAt: new Date(page.version.when), syncedAt: new Date() } },
          { upsert: true },
        );

        changes.push({ changeType: 'deleted', entityType: 'page', id: page.id, title: page.title });
      }
    } catch (err: any) {
      this.logger.warn('Trashed page query partial failure', err?.message);
    }

    return changes;
  }

  private async syncMovedPages(since: Date): Promise<ChangeResult[]> {
    this.logger.log('🔀  Syncing moved pages...');
    const changes: ChangeResult[] = [];
    const sinceIso = since.toISOString().replace('T', ' ').substring(0, 16);
    const spaceFilter = this.allowedSpaces && this.allowedSpaces.length ? `space in (${this.allowedSpaces.map((s) => `"${s}"`).join(',')}) AND ` : '';
    const cql = `${spaceFilter}lastModified > "${sinceIso}" AND type = page`;
    const pages = await this.paginateAllCql(cql, 'ancestors,version,space');

    for (const page of pages) {
      const newParentId = page.ancestors?.at(-1)?.id ?? null;
      const existing = await this.pageModel.findOne({ confluenceId: page.id });

      if (existing && existing.parentId !== newParentId) {
        await this.pageModel.updateOne({ confluenceId: page.id }, { $set: { parentId: newParentId, ancestorIds: (page.ancestors ?? []).map((a) => a.id), modifiedAt: new Date(page.version.when), syncedAt: new Date() } });
        changes.push({ changeType: 'moved', entityType: 'page', id: page.id, title: page.title });
        this.logger.log(`🔀 Page moved: "${page.title}" | ${existing.parentId ?? 'root'} → ${newParentId ?? 'root'}`);
      }
    }

    return changes;
  }

  private async syncFolders(since: Date): Promise<ChangeResult[]> {
    this.logger.log('📂  Syncing folder structure...');
    const changes: ChangeResult[] = [];
    const sinceIso = since.toISOString().replace('T', ' ').substring(0, 16);
    const spaceFilter = this.allowedSpaces && this.allowedSpaces.length ? `space in (${this.allowedSpaces.map((s) => `"${s}"`).join(',')}) AND ` : '';
    const cql = `${spaceFilter}lastModified > "${sinceIso}" AND type = page`;

    try {
      let pages = await this.paginateAllCql(cql, 'children.page,version,space,ancestors');
      this.logger.debug(`Folder sync fetched ${pages?.length ?? 0} pages`);

      if (!pages || pages.length === 0) {
        this.logger.debug('Folder sync CQL returned no results — falling back to per-space enumeration');
        const dbSpaces = await this.folderModel.find({ type: 'space' });
        const spaces = (this.allowedSpaces && this.allowedSpaces.length) ? this.allowedSpaces.map((k) => ({ confluenceId: k })) : dbSpaces;
        const allPages: ConfluenceApiPage[] = [];

        for (const sp of spaces) {
          try {
            const spCql = `space = \"${sp.confluenceId}\" AND type = page`;
            const spPages = await this.paginateAllCql(spCql, 'children.page,version,ancestors,space');
            allPages.push(...spPages);
            this.logger.debug(`Fetched ${spPages.length} pages for space ${sp.confluenceId} via CQL`);
          } catch (err: any) {
            this.logger.warn(`Failed to fetch pages for space ${sp.confluenceId}: ${err?.message ?? err}`);
          }
        }

        pages = allPages;
        this.logger.debug(`Fallback enumeration produced ${pages.length} pages`);
      }

      const folderChangeMap = new Map<string, ChangeType>();

      for (const page of (pages ?? [])) {
        const pageId = page.id;
        const parentId = page.ancestors?.at(-1)?.id ?? null;
        const childIds = (page as any).children?.page?.results?.map((c: any) => c.id) ?? [];
        const pageData = {
          confluenceId: pageId,
          type: page.type as 'page' | 'blogpost',
          title: page.title,
          spaceKey: page.space.key,
          status: 'current' as const,
          parentId,
          ancestorIds: (page.ancestors ?? []).map((a) => a.id),
          body: page.body?.storage?.value ?? '',
          version: page.version?.number ?? 0,
          versionBy: page.version?.by?.displayName ?? 'unknown',
          modifiedAt: new Date(page.version.when),
          syncedAt: new Date(),
          createdAt: new Date(page.version.when),
        };

        await this.pageModel.findOneAndUpdate(
          { confluenceId: pageId },
          { $set: pageData },
          { upsert: true, returnDocument: 'after' as any },
        );

        if (childIds.length > 0) {
          const existing = await this.folderModel.findOne({ confluenceId: pageId, type: 'folder' });
          const isNew = !existing;
          const prevParent = existing?.parentId ?? null;

          await this.folderModel.findOneAndUpdate(
            { confluenceId: pageId, type: 'folder' },
            {
              $set: {
                confluenceId: pageId,
                type: 'folder',
                title: page.title,
                spaceKey: page.space.key,
                parentId,
                status: 'active',
                children: childIds,
                movedFrom: prevParent !== parentId ? prevParent : null,
                modifiedAt: new Date(page.version.when),
                syncedAt: new Date(),
              },
            },
            { upsert: true, returnDocument: 'after' as any },
          );

          const changeType: ChangeType = isNew ? 'created' : prevParent !== parentId ? 'moved' : 'updated';
          folderChangeMap.set(pageId, changeType);
        }

        if (parentId) {
          const parentExisting = await this.folderModel.findOne({ confluenceId: parentId, type: 'folder' });

          if (parentExisting) {
            await this.folderModel.updateOne(
              { confluenceId: parentId, type: 'folder' },
              { $addToSet: { children: pageId }, $set: { syncedAt: new Date() } },
            );
            folderChangeMap.set(parentId, 'updated');
          } else {
            const grandParent = page.ancestors?.length > 1 ? page.ancestors?.at(-2)?.id ?? null : null;
            await this.folderModel.findOneAndUpdate(
              { confluenceId: parentId, type: 'folder' },
              {
                $setOnInsert: {
                  confluenceId: parentId,
                  type: 'folder',
                  title: 'unknown',
                  spaceKey: page.space.key,
                  parentId: grandParent,
                  status: 'active',
                  children: [pageId],
                  modifiedAt: new Date(),
                  syncedAt: new Date(),
                },
              },
              { upsert: true, returnDocument: 'after' as any },
            );
            folderChangeMap.set(parentId, 'created');
            (async () => {
              try {
                const res = await this.http.get(`/wiki/rest/api/content/${encodeURIComponent(parentId)}`, { params: { expand: 'title' } });
                const remoteTitle = res.data?.title;
                if (remoteTitle) {
                  await this.folderModel.updateOne({ confluenceId: parentId, type: 'folder' }, { $set: { title: remoteTitle, syncedAt: new Date() } });
                  this.logger.log(`Resolved parent title for ${parentId}: ${remoteTitle}`);
                }
              } catch (err: any) {
                this.logger.debug(`Could not fetch parent title ${parentId}: ${err?.message ?? err}`);
              }
            })();
          }
        }
      }

      for (const [fid, ct] of folderChangeMap) {
        const doc = await this.folderModel.findOne({ confluenceId: fid, type: 'folder' });
        changes.push({ changeType: ct, entityType: 'folder', id: fid, title: doc?.title ?? fid });
      }

      this.logger.debug(`Folder sync produced ${folderChangeMap.size} folder changes`);
    } catch (err: any) {
      this.logger.warn('Folder sync partial failure', err?.message);
    }

    return changes;
  }

  private async reconcileOrphanedDocs() {
    this.logger.log('🔍  Reconciling orphaned documents...');
    const spaceFilter = this.allowedSpaces && this.allowedSpaces.length ? `space in (${this.allowedSpaces.map((s) => `"${s}"`).join(',')}) AND ` : '';
    const allPages = await this.paginateAllCql(`${spaceFilter}type IN (page, blogpost) AND status = current`, 'version');
    const liveIds = new Set(allPages.map((p) => p.id));

    const dbCurrentPages = await this.pageModel.find({ status: 'current' }, { confluenceId: 1 });
    const orphanIds = dbCurrentPages.filter((p) => !liveIds.has(p.confluenceId)).map((p) => p.confluenceId);

    if (orphanIds.length) {
      this.logger.warn(`Found ${orphanIds.length} orphaned pages. Marking as deleted.`);
      await this.pageModel.updateMany({ confluenceId: { $in: orphanIds } }, { $set: { status: 'deleted', deletedAt: new Date(), syncedAt: new Date() } });
    }
  }

  private async paginateAll<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    const results: T[] = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const res = await this.http.get(endpoint, { params: { ...params, start, limit: this.BATCH_SIZE } });
      const data = res.data;
      const pageCount = data.results?.length ?? data.size ?? 0;
      results.push(...(data.results ?? []));

      this.logger.debug(`paginateAll: endpoint=${endpoint} start=${start} limit=${this.BATCH_SIZE} returned=${pageCount} totalSize=${data.totalSize} size=${data.size} _links.next=${data._links?.next}`);

      if (typeof data.totalSize === 'number') {
        const fetched = start + pageCount;
        hasMore = fetched < data.totalSize;
        start = fetched;
      } else {
        hasMore = pageCount === this.BATCH_SIZE;
        start = start + pageCount;
      }
    }

    return results;
  }

  private async paginateAllCql(cql: string, expand = 'body.storage,version,ancestors,space', status?: string): Promise<ConfluenceApiPage[]> {
    const results: ConfluenceApiPage[] = [];
    let params: any = { cql, expand, limit: this.BATCH_SIZE, start: 0 };
    let nextUrl: string | null = '/wiki/rest/api/content/search';
    let useParams = true;

    while (nextUrl) {
      this.logger.debug(`Confluence CQL request: ${cql} ${useParams ? `start=${params.start} limit=${params.limit}` : `nextUrl=${nextUrl}`}`);
      let res;
      try {
        if (useParams) {
          const query: Record<string, any> = { ...params };
          if (status) query.status = status;
          res = await this.http.get('/wiki/rest/api/content/search', { params: query });
        } else {
          res = await this.http.get(nextUrl);
        }
      } catch (err: any) {
        this.logger.error('Confluence API error', err.response?.status, err.response?.data ?? err.message);
        throw err;
      }

      const data = res.data;
      const pageCount = data.results?.length ?? data.size ?? 0;
      results.push(...(data.results ?? []));

      this.logger.debug(`paginateAllCql: returned=${pageCount} totalSize=${data.totalSize} size=${data.size} _links.next=${data._links?.next}`);

      if (data._links?.next) {
        // Follow the Confluence cursor-based next link when available.
        // Confluence may return a path like "/rest/api/..." while the app uses "/wiki/rest/api/...".
        const link = data._links.next as string;
        if (link.startsWith('/rest/api/')) {
          nextUrl = `/wiki${link}`;
        } else {
          nextUrl = link;
        }
        useParams = false;
      } else if (typeof data.totalSize === 'number') {
        const fetched = params.start + pageCount;
        if (fetched < data.totalSize) {
          params.start = fetched;
          useParams = true;
        } else {
          nextUrl = null;
        }
      } else {
        if (pageCount === this.BATCH_SIZE) {
          params.start += pageCount;
          useParams = true;
        } else {
          nextUrl = null;
        }
      }
    }

    return results;
  }

  private async getOrCreateSyncMeta(): Promise<SyncMeta> {
    const existing = await this.syncMetaModel.findById(this.SYNC_META_ID);
    if (existing) return existing.toObject();

    return this.syncMetaModel.create({ _id: this.SYNC_META_ID, lastFullSyncAt: null, lastIncrementalSyncAt: null, lastRunStatus: 'success', totalPagesSynced: 0, totalFoldersSynced: 0 });
  }

  private async updateSyncMeta(syncStart: Date, isFull: boolean, status: 'success' | 'failed' | 'partial', changes: ChangeResult[], errorMsg?: string) {
    const pageCount = changes.filter((c) => c.entityType === 'page').length;
    const folderCount = changes.filter((c) => c.entityType === 'folder' || c.entityType === 'space').length;

    await this.syncMetaModel.findByIdAndUpdate(this.SYNC_META_ID, { $set: { ...(isFull ? { lastFullSyncAt: syncStart } : { lastIncrementalSyncAt: syncStart }), lastRunStatus: status, lastRunError: errorMsg ?? null, totalPagesSynced: pageCount, totalFoldersSynced: folderCount } }, { upsert: true });
  }

  private logChangeSummary(changes: ChangeResult[]) {
    const summary = changes.reduce((acc, c) => { acc[c.changeType] = (acc[c.changeType] ?? 0) + 1; return acc; }, {} as Record<string, number>);
    this.logger.log('📊 Change summary: ' + JSON.stringify(summary));
  }

  /**
   * Build nested hierarchy of folders and pages for a space.
   * Returns nodes with shape: { id, title, spaceKey, parentId, children: [] }
   */
  public async buildHierarchy(spaceKey?: string) {
    const match: any = {};
    if (spaceKey) match.spaceKey = spaceKey;

    const folders = await this.folderModel.find({ type: { $in: ['space', 'folder'] }, ...(spaceKey ? { spaceKey } : {}) }).lean();
    const pages = await this.pageModel.find({ ...(spaceKey ? { spaceKey } : {}) }).lean();

    const map = new Map<string, any>();

    for (const f of folders) {
      map.set(f.confluenceId, { id: String(f.confluenceId), type: f.type === 'space' ? 'space' : 'folder', title: f.title ?? 'unknown', spaceKey: f.spaceKey ?? spaceKey ?? null, parentId: f.parentId ?? null, children: [] });
    }

    for (const p of pages) {
      if (!map.has(p.confluenceId)) {
        map.set(p.confluenceId, { id: String(p.confluenceId), type: 'page', title: p.title ?? 'unknown', spaceKey: p.spaceKey ?? spaceKey ?? null, parentId: p.parentId ?? null, children: [] });
      } else {
        const existing = map.get(p.confluenceId);
        existing.title = existing.title ?? p.title;
        existing.spaceKey = existing.spaceKey ?? p.spaceKey;
        existing.type = existing.type ?? 'page';
      }
    }

    const attached = new Set<string>();
    for (const folder of folders) {
      const parentNode = map.get(folder.confluenceId);
      if (!parentNode) continue;

      const pageIds = Array.isArray(folder.children) ? folder.children : [];
      for (const childId of pageIds) {
        const childNode = map.get(childId);
        if (!childNode) continue;
        if (!parentNode.children.some((child: any) => child.id === childId)) {
          parentNode.children.push(childNode);
        }
        attached.add(childId);
      }
    }

    for (const node of map.values()) {
      if (attached.has(node.id)) continue;
      if (node.parentId && map.has(node.parentId)) {
        const parentNode = map.get(node.parentId);
        if (!parentNode.children.some((child: any) => child.id === node.id)) {
          parentNode.children.push(node);
        }
        attached.add(node.id);
      }
    }

    const roots: any[] = [];
    for (const node of map.values()) {
      if (!attached.has(node.id)) {
        roots.push(node);
      }
    }

    this.logger.debug(`Built hierarchy for space=${spaceKey ?? 'all'} nodes=${map.size} roots=${roots.length}`);
    return roots;
  }
}
