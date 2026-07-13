import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosInstance } from 'axios';

// ─────────────────────────────────────────────
// MONGOOSE DOCUMENT INTERFACES
// ─────────────────────────────────────────────

export interface ConfluencePage {
  confluenceId: string;
  title: string;
  spaceKey: string;
  spaceId: string;
  status: 'current' | 'trashed' | 'deleted';
  parentId: string | null;
  parentType: 'page' | 'folder' | 'space' | null;
  ancestorIds: string[];
  body: string;              // storage format HTML
  bodyFormat: 'storage';
  version: number;
  versionBy: string;
  createdAt: Date;
  modifiedAt: Date;
  deletedAt?: Date;
  syncedAt: Date;
}

export interface ConfluenceFolder {
  confluenceId: string;
  title: string;
  spaceKey: string;
  spaceId: string;
  parentId: string | null;
  parentType: 'folder' | 'space' | null;
  status: 'active' | 'archived' | 'deleted';
  childPageIds: string[];
  childFolderIds: string[];
  // body content if the folder itself has content
  body: string;
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

export interface HierarchyNode {
  id: string;
  type: 'folder' | 'page';
  title: string;
  spaceKey: string;
  parentId: string | null;
  parentType: string | null;
  version?: number;
  modifiedAt?: Date;
  children: HierarchyNode[];
}

// ─────────────────────────────────────────────
// v2 API RESPONSE SHAPES
// ─────────────────────────────────────────────

interface V2Page {
  id: string;
  title: string;
  status: string;
  spaceId: string;
  parentId: string | null;
  parentType: 'page' | 'folder' | 'space' | null;
  authorId: string;
  createdAt: string;
  version: {
    number: number;
    createdAt: string;
    authorId?: string;
    message?: string;
  };
  body?: {
    storage?: { value: string; representation: 'storage' };
  };
}

interface V2Folder {
  id: string;
  title: string;
  spaceId: string;
  parentId: string | null;
  parentType: 'folder' | 'space' | null;
}

interface V2ChildItem {
  id: string;
  type: 'page' | 'folder';
  title: string;
  spaceId?: string;
  parentId?: string | null;
  parentType?: string | null;
}

interface V2PagedResponse<T> {
  results: T[];
  _links?: {
    next?: string;   // cursor URL e.g. /wiki/api/v2/spaces/{id}/pages?cursor=xxx
    base?: string;
  };
}

// ─────────────────────────────────────────────
// TREE NODE — in-memory during discovery
// ─────────────────────────────────────────────

interface TreeNode {
  id: string;
  type: 'space' | 'folder' | 'page';
  title: string;
  spaceId: string;
  spaceKey: string;
  parentId: string | null;
  parentType: 'page' | 'folder' | 'space' | null;
  childPageIds: string[];
  childFolderIds: string[];
  depth: number;
}

@Injectable()
export class ConfluenceSyncCron implements OnModuleInit {
  private readonly logger = new Logger(ConfluenceSyncCron.name);
  private readonly http: AxiosInstance;
  private readonly BATCH_SIZE = 250;        // v2 max is 250
  private readonly CONCURRENCY = 5;         // parallel page-content fetches
  private readonly SYNC_META_ID = 'confluence_sync_meta';
  private enabled = true;
  private allowedSpaceIds: string[];        // v2 uses numeric/UUID space IDs
  private allowedSpaceKeys: string[];       // kept for display / mongo key

  // spaceId → spaceKey lookup built during syncSpaces phase
  private spaceIdToKey = new Map<string, string>();

  constructor(
    @InjectModel('ConfluencePage') private pageModel: Model<ConfluencePage>,
    @InjectModel('ConfluenceFolder') private folderModel: Model<ConfluenceFolder>,
    @InjectModel('SyncMeta') private syncMetaModel: Model<SyncMeta>,
  ) {
    const baseURL =
      process.env.CONFLUENCE_BASE_URL ??
      process.env.ATLASSIAN_SITE_URL ??
      process.env.ATLASSIAN_URL;

    const email =
      process.env.CONFLUENCE_EMAIL ?? process.env.ATLASSIAN_EMAIL;

    const token =
      process.env.CONFLUENCE_API_TOKEN ?? process.env.ATLASSIAN_API_KEY;

    // Space keys from env  e.g. "~712020ee56,MYSPACE"
    const spaceList =
      process.env.CONFLUENCE_SYNC_SPACES ??
      process.env.ATLASSIAN_SYNC_SPACES ??
      process.env.CONFLUENCE_SPACE_KEY ??
      '~712020ee5617697c9048f0ad47c93d292f605d';

    this.allowedSpaceKeys = spaceList
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Space IDs resolved at runtime from the v2 spaces API
    this.allowedSpaceIds = [];

    if (!baseURL) {
      this.logger.warn('Confluence base URL not configured — sync disabled.');
      this.enabled = false;
      this.http = axios.create();
      return;
    }

    if (!email || !token) {
      this.logger.warn('Confluence credentials not configured — sync disabled.');
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

  // ─────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    this.logger.log('ConfluenceSyncCron initialized — initial full sync in 30s');
    setTimeout(() => {
      this.fullSync().catch((err) =>
        this.logger.error('Initial full sync failed', err?.message ?? err),
      );
    }, 30_000);
  }

  // Full sync: every Sunday midnight
  @Cron('0 0 * * 0')
  async fullSync(): Promise<void> {
    if (!this.enabled) { this.logger.warn('Sync disabled — skipping.'); return; }
    this.logger.log('🔄  Full sync started');
    const start = new Date();

    try {
      // Phase 0 — resolve space IDs from keys
      await this.resolveSpaceIds();

      let totalPages = 0;
      let totalFolders = 0;

      for (const spaceId of this.allowedSpaceIds) {
        const spaceKey = this.spaceIdToKey.get(spaceId) ?? spaceId;
        this.logger.log(`\n══ Space: ${spaceKey} (${spaceId}) ══`);

        // Phase 1 — discover full tree for this space
        const tree = await this.discoverSpaceTree(spaceId, spaceKey);

        // Phase 2 — persist tree structure (folders + page stubs)
        const { pages: pCount, folders: fCount } = await this.persistTree(tree, spaceId, spaceKey);
        totalPages += pCount;
        totalFolders += fCount;

        // Phase 3 — fetch & store full body content for every page
        const pageIds = [...tree.values()]
          .filter((n) => n.type === 'page')
          .map((n) => n.id);
        await this.syncPageContents(pageIds, spaceId, spaceKey);
      }

      await this.updateSyncMeta(start, true, 'success', totalPages, totalFolders);
      this.logger.log(`✅  Full sync complete — pages=${totalPages} folders=${totalFolders}`);
    } catch (err: any) {
      this.logger.error('❌  Full sync failed', err?.message ?? err);
      await this.updateSyncMeta(start, true, 'failed', 0, 0, err?.message);
    }
  }

  // Incremental: every hour
  @Cron('0 * * * *')
  async incrementalSync(): Promise<void> {
    if (!this.enabled) return;
    const meta = await this.getOrCreateSyncMeta();
    if (!meta.lastFullSyncAt) {
      this.logger.warn('No full sync on record — triggering full sync instead.');
      return this.fullSync();
    }
    this.logger.log('⏱  Incremental sync — re-running full sync (v2 has no delta endpoint)');
    // v2 doesn't have a "modified since" pages endpoint the way CQL does.
    // Simplest correct approach: full re-sync (upserts are idempotent).
    // For large spaces you'd filter by lastModifiedDate via v1 CQL, but v2 tree
    // traversal is the source of truth here.
    return this.fullSync();
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 0 — Resolve space keys → space IDs
  // ─────────────────────────────────────────────────────────────

  private async resolveSpaceIds(): Promise<void> {
    this.logger.log('🔍  Resolving space IDs from keys...');
    this.allowedSpaceIds = [];
    this.spaceIdToKey.clear();

    for (const key of this.allowedSpaceKeys) {
      try {
        // GET /wiki/api/v2/spaces?keys=KEY
        const res = await this.http.get<V2PagedResponse<{ id: string; key: string; name: string }>>('/wiki/api/v2/spaces', {
          params: { keys: key, limit: 1 },
        });
        const space = res.data.results?.[0];
        if (!space) {
          this.logger.warn(`Space key "${key}" not found via v2 API.`);
          continue;
        }
        this.allowedSpaceIds.push(space.id);
        this.spaceIdToKey.set(space.id, space.key);
        this.logger.log(`  ${space.key} → id=${space.id} name="${space.name}"`);
      } catch (err: any) {
        this.logger.warn(`Failed to resolve space key "${key}": ${err?.message}`);
      }
    }

    if (this.allowedSpaceIds.length === 0) {
      throw new Error('No valid space IDs resolved — aborting sync.');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 1 — Discover full n-depth tree
  //
  // Strategy:
  //   1. GET /wiki/api/v2/spaces/{spaceId}/pages  → flat list of ALL pages
  //      (follows _links.next cursor until exhausted)
  //   2. For each page that has parentType = 'folder', fetch that folder via
  //      GET /wiki/api/v2/folders/{folderId}  to capture folder metadata.
  //   3. Build a Map<id, TreeNode> with parent/child relationships.
  // ─────────────────────────────────────────────────────────────

  private async discoverSpaceTree(
    spaceId: string,
    spaceKey: string,
  ): Promise<Map<string, TreeNode>> {
    this.logger.log(`📐  Discovering tree for space ${spaceKey}...`);
    const tree = new Map<string, TreeNode>();

    // ── Step 1: Pull ALL pages flat ──────────────────────────────
    const allPages = await this.fetchAllSpacePages(spaceId);
    this.logger.log(`  Pages discovered: ${allPages.length}`);

    // Insert page nodes
    for (const page of allPages) {
      const node: TreeNode = {
        id: page.id,
        type: 'page',
        title: page.title,
        spaceId,
        spaceKey,
        parentId: page.parentId,
        parentType: page.parentType ?? null,
        childPageIds: [],
        childFolderIds: [],
        depth: 0, // computed below
      };
      tree.set(page.id, node);
    }

    // ── Step 2: Collect unique folder IDs referenced by pages ────
    const folderIds = new Set<string>();
    for (const page of allPages) {
      if (page.parentType === 'folder' && page.parentId) {
        folderIds.add(page.parentId);
      }
    }

    // Also walk ancestors: if a page's parent is a page whose parent is a folder, etc.
    // We do a breadth-first fetch of all referenced folder IDs.
    const resolvedFolderIds = new Set<string>();
    const folderQueue = [...folderIds];

    while (folderQueue.length > 0) {
      const batch = folderQueue.splice(0, this.CONCURRENCY);
      await Promise.all(
        batch.map(async (folderId) => {
          if (resolvedFolderIds.has(folderId)) return;
          resolvedFolderIds.add(folderId);

          try {
            const folder = await this.fetchFolder(folderId);
            const node: TreeNode = {
              id: folder.id,
              type: 'folder',
              title: folder.title,
              spaceId,
              spaceKey,
              parentId: folder.parentId,
              parentType: folder.parentType ?? null,
              childPageIds: [],
              childFolderIds: [],
              depth: 0,
            };
            tree.set(folder.id, node);

            // If this folder's parent is also a folder, enqueue it
            if (folder.parentType === 'folder' && folder.parentId && !resolvedFolderIds.has(folder.parentId)) {
              folderQueue.push(folder.parentId);
            }
          } catch (err: any) {
            this.logger.warn(`Could not fetch folder ${folderId}: ${err?.message}`);
          }
        }),
      );
    }

    // ── Step 3: Wire up parent → children ────────────────────────
    for (const node of tree.values()) {
      if (!node.parentId) continue;
      const parent = tree.get(node.parentId);
      if (!parent) continue;

      if (node.type === 'folder') {
        if (!parent.childFolderIds.includes(node.id)) {
          parent.childFolderIds.push(node.id);
        }
      } else {
        if (!parent.childPageIds.includes(node.id)) {
          parent.childPageIds.push(node.id);
        }
      }
    }

    // ── Step 4: Compute depth (BFS from roots) ───────────────────
    const roots = [...tree.values()].filter((n) => !n.parentId || !tree.has(n.parentId));
    const depthQueue: Array<{ id: string; depth: number }> = roots.map((r) => ({ id: r.id, depth: 0 }));
    while (depthQueue.length > 0) {
      const { id, depth } = depthQueue.shift()!;
      const node = tree.get(id);
      if (!node) continue;
      node.depth = depth;
      const children = [...node.childFolderIds, ...node.childPageIds];
      for (const childId of children) {
        depthQueue.push({ id: childId, depth: depth + 1 });
      }
    }

    const folderCount = [...tree.values()].filter((n) => n.type === 'folder').length;
    const pageCount = [...tree.values()].filter((n) => n.type === 'page').length;
    const maxDepth = Math.max(...[...tree.values()].map((n) => n.depth), 0);
    this.logger.log(`  Tree built — folders=${folderCount} pages=${pageCount} maxDepth=${maxDepth}`);

    return tree;
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 2 — Persist tree (structure only, no body yet)
  // ─────────────────────────────────────────────────────────────

  private async persistTree(
    tree: Map<string, TreeNode>,
    spaceId: string,
    spaceKey: string,
  ): Promise<{ pages: number; folders: number }> {
    this.logger.log(`💾  Persisting tree structure for ${spaceKey}...`);
    const now = new Date();
    let pageCount = 0;
    let folderCount = 0;

    for (const node of tree.values()) {
      if (node.type === 'folder') {
        await this.folderModel.findOneAndUpdate(
          { confluenceId: node.id },
          {
            $set: {
              confluenceId: node.id,
              title: node.title,
              spaceId,
              spaceKey,
              parentId: node.parentId,
              parentType: node.parentType,
              status: 'active',
              childPageIds: node.childPageIds,
              childFolderIds: node.childFolderIds,
              syncedAt: now,
            },
          },
          { upsert: true },
        );
        folderCount++;
      } else {
        // Page stub — body will be filled in Phase 3
        await this.pageModel.findOneAndUpdate(
          { confluenceId: node.id },
          {
            $set: {
              confluenceId: node.id,
              title: node.title,
              spaceId,
              spaceKey,
              parentId: node.parentId,
              parentType: node.parentType,
              status: 'current',
              syncedAt: now,
            },
            // Don't overwrite body/version if already synced; Phase 3 handles it
            $setOnInsert: {
              body: '',
              version: 0,
              versionBy: '',
              ancestorIds: [],
              createdAt: now,
              modifiedAt: now,
            },
          },
          { upsert: true },
        );
        pageCount++;
      }
    }

    // Mark pages in DB that are no longer in the tree as deleted
    const livePageIds = [...tree.values()]
      .filter((n) => n.type === 'page')
      .map((n) => n.id);

    const orphaned = await this.pageModel.find(
      { spaceKey, status: 'current', confluenceId: { $nin: livePageIds } },
      { confluenceId: 1 },
    );
    if (orphaned.length > 0) {
      this.logger.warn(`  ${orphaned.length} orphaned pages — marking deleted`);
      await this.pageModel.updateMany(
        { confluenceId: { $in: orphaned.map((p) => p.confluenceId) } },
        { $set: { status: 'deleted', deletedAt: now, syncedAt: now } },
      );
    }

    this.logger.log(`  Persisted — pages=${pageCount} folders=${folderCount}`);
    return { pages: pageCount, folders: folderCount };
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 3 — Fetch & store full page body content
  //
  // For each page ID:
  //   GET /wiki/api/v2/pages/{id}?body-format=storage
  //   → stores body.storage.value, version, createdAt, modifiedAt, ancestorIds
  //
  // If a folder itself has content (folders can have body in Confluence):
  //   We don't fetch folder body here as the v2 folder endpoint doesn't
  //   return body — that requires the v1 content endpoint for "folder" type,
  //   which is handled separately below.
  // ─────────────────────────────────────────────────────────────

  private async syncPageContents(
    pageIds: string[],
    spaceId: string,
    spaceKey: string,
  ): Promise<void> {
    this.logger.log(`📄  Syncing content for ${pageIds.length} pages in ${spaceKey}...`);
    const now = new Date();
    let done = 0;

    // Process in concurrent batches
    for (let i = 0; i < pageIds.length; i += this.CONCURRENCY) {
      const batch = pageIds.slice(i, i + this.CONCURRENCY);

      await Promise.all(
        batch.map(async (pageId) => {
          try {
            const page = await this.fetchPageWithBody(pageId);

            // Build ancestor chain from parentId chain (v2 doesn't return ancestors[]
            // directly in the pages list — we reconstruct from the tree we have in DB)
            const ancestorIds = await this.resolveAncestorIds(page.parentId, page.parentType);

            await this.pageModel.findOneAndUpdate(
              { confluenceId: pageId },
              {
                $set: {
                  confluenceId: pageId,
                  title: page.title,
                  spaceId,
                  spaceKey,
                  status: page.status === 'trashed' ? 'trashed' : 'current',
                  parentId: page.parentId,
                  parentType: page.parentType ?? null,
                  ancestorIds,
                  body: page.body?.storage?.value ?? '',
                  bodyFormat: 'storage',
                  version: page.version.number,
                  versionBy: page.version.authorId ?? 'unknown',
                  createdAt: new Date(page.createdAt),
                  modifiedAt: new Date(page.version.createdAt),
                  syncedAt: now,
                },
              },
              { upsert: true },
            );

            done++;
            if (done % 50 === 0) {
              this.logger.log(`  Content progress: ${done}/${pageIds.length}`);
            }
          } catch (err: any) {
            this.logger.warn(`  Failed to sync page ${pageId}: ${err?.message}`);
          }
        }),
      );
    }

    this.logger.log(`  ✅ Content sync done — ${done}/${pageIds.length} pages`);
  }

  // ─────────────────────────────────────────────────────────────
  // v2 API HELPERS
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /wiki/api/v2/spaces/{spaceId}/pages
   * Returns ALL pages (flat) via cursor pagination.
   * Does NOT include body — just metadata + parentId/parentType.
   */
  private async fetchAllSpacePages(spaceId: string): Promise<V2Page[]> {
    const results: V2Page[] = [];
    // Start with no cursor
    let nextUrl: string | null = `/wiki/api/v2/spaces/${encodeURIComponent(spaceId)}/pages`;
    let params: Record<string, any> = { limit: this.BATCH_SIZE };

    while (nextUrl) {
      this.logger.debug(`  GET ${nextUrl} params=${JSON.stringify(params)}`);
      let res;
      try {
        res = await this.http.get<V2PagedResponse<V2Page>>(nextUrl, { params });
      } catch (err: any) {
        this.logger.error(`fetchAllSpacePages error: ${err?.response?.status} ${err?.message}`);
        throw err;
      }

      const data = res.data;
      results.push(...(data.results ?? []));

      this.logger.debug(`  batch=${data.results?.length ?? 0} total so far=${results.length} hasNext=${!!data._links?.next}`);

      if (data._links?.next) {
        // next is a relative path like /wiki/api/v2/spaces/{id}/pages?cursor=xxx
        // axios baseURL will be prepended — just use the path
        const nextPath = data._links.next as string;
        // Strip query string from the URL — cursor is embedded in the path
        // The next link is a full relative URL with its own query params
        nextUrl = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
        params = {}; // cursor is already in the URL from _links.next
      } else {
        nextUrl = null;
      }
    }

    return results;
  }

  /**
   * GET /wiki/api/v2/pages/{id}?body-format=storage
   * Full page with body content.
   */
  private async fetchPageWithBody(pageId: string): Promise<V2Page> {
    const res = await this.http.get<V2Page>(
      `/wiki/api/v2/pages/${encodeURIComponent(pageId)}`,
      { params: { 'body-format': 'storage' } },
    );
    return res.data;
  }

  /**
   * GET /wiki/api/v2/folders/{id}
   * Folder metadata (no body — Confluence v2 folders don't expose body).
   */
  private async fetchFolder(folderId: string): Promise<V2Folder> {
    const res = await this.http.get<V2Folder>(
      `/wiki/api/v2/folders/${encodeURIComponent(folderId)}`,
    );
    return res.data;
  }

  /**
   * GET /wiki/api/v2/pages/{id}/children   (or /folders/{id}/children)
   * Used if you need explicit children per node (alternative discovery strategy).
   * Returns mixed page+folder results.
   */
  private async fetchChildren(
    id: string,
    type: 'page' | 'folder',
  ): Promise<V2ChildItem[]> {
    const results: V2ChildItem[] = [];
    let nextUrl: string | null =
      type === 'folder'
        ? `/wiki/api/v2/folders/${encodeURIComponent(id)}/children`
        : `/wiki/api/v2/pages/${encodeURIComponent(id)}/children`;
    let params: Record<string, any> = { limit: this.BATCH_SIZE };

    while (nextUrl) {
      const res = await this.http.get<V2PagedResponse<V2ChildItem>>(nextUrl, { params });
      results.push(...(res.data.results ?? []));
      if (res.data._links?.next) {
        nextUrl = res.data._links.next as string;
        params = {};
      } else {
        nextUrl = null;
      }
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITY
  // ─────────────────────────────────────────────────────────────

  /**
   * Walk up the parent chain in MongoDB to reconstruct ancestorIds[].
   * v2 flat page list doesn't return ancestors[] — we derive it from stored tree.
   */
  private async resolveAncestorIds(
    parentId: string | null,
    parentType: string | null,
  ): Promise<string[]> {
    const ancestors: string[] = [];
    let currentId = parentId;
    let currentType = parentType;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      ancestors.unshift(currentId); // prepend so root is first

      // Look up the parent in whichever collection it belongs to
      if (currentType === 'folder') {
        const folder = await this.folderModel.findOne(
          { confluenceId: currentId },
          { parentId: 1, parentType: 1 },
        ).lean();
        currentId = folder?.parentId ?? null;
        currentType = folder?.parentType ?? null;
      } else if (currentType === 'page') {
        const page = await this.pageModel.findOne(
          { confluenceId: currentId },
          { parentId: 1, parentType: 1 },
        ).lean();
        currentId = (page as any)?.parentId ?? null;
        currentType = (page as any)?.parentType ?? null;
      } else {
        break; // 'space' root — stop
      }
    }

    return ancestors;
  }

  private async getOrCreateSyncMeta(): Promise<SyncMeta> {
    const existing = await this.syncMetaModel.findById(this.SYNC_META_ID);
    if (existing) return existing.toObject() as SyncMeta;
    return this.syncMetaModel.create({
      _id: this.SYNC_META_ID,
      lastFullSyncAt: null,
      lastIncrementalSyncAt: null,
      lastRunStatus: 'success',
      totalPagesSynced: 0,
      totalFoldersSynced: 0,
    });
  }

  private async updateSyncMeta(
    syncStart: Date,
    isFull: boolean,
    status: 'success' | 'failed' | 'partial',
    pages: number,
    folders: number,
    errorMsg?: string,
  ): Promise<void> {
    await this.syncMetaModel.findByIdAndUpdate(
      this.SYNC_META_ID,
      {
        $set: {
          ...(isFull
            ? { lastFullSyncAt: syncStart }
            : { lastIncrementalSyncAt: syncStart }),
          lastRunStatus: status,
          lastRunError: errorMsg ?? null,
          totalPagesSynced: pages,
          totalFoldersSynced: folders,
        },
      },
      { upsert: true },
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC — used by REST controllers
  // ─────────────────────────────────────────────────────────────

  /**
   * Returns the stored n-depth tree from MongoDB for a given space.
   * Shape: [ { id, type, title, parentId, children: [...] } ]
   */
  public async buildHierarchy(spaceKey?: string): Promise<any[]> {
    const folderFilter = spaceKey ? { spaceKey } : {};
    const pageFilter:any = spaceKey ? { spaceKey, status: 'current' } : { status: 'current' };

    const folders = await this.folderModel.find(folderFilter).lean();
    const pages = await this.pageModel
      .find(pageFilter, {
        confluenceId: 1, title: 1, spaceKey: 1, parentId: 1, parentType: 1,
        version: 1, modifiedAt: 1,
      })
      .lean();

    type HierarchyNode = {
      id: string;
      type: 'folder' | 'page';
      title: string;
      spaceKey: string;
      parentId: string | null;
      parentType: string | null;
      version?: number;
      modifiedAt?: Date;
      children: HierarchyNode[];
    };

    const map = new Map<string, HierarchyNode>();

    for (const f of folders) {
      map.set(f.confluenceId, {
        id: f.confluenceId,
        type: 'folder',
        title: f.title,
        spaceKey: f.spaceKey,
        parentId: f.parentId ?? null,
        parentType: f.parentType ?? null,
        children: [],
      });
    }

    for (const p of pages) {
      if (!map.has(p.confluenceId)) {
        map.set(p.confluenceId, {
          id: p.confluenceId,
          type: 'page',
          title: p.title,
          spaceKey: p.spaceKey,
          parentId: (p as any).parentId ?? null,
          parentType: (p as any).parentType ?? null,
          version: (p as any).version,
          modifiedAt: (p as any).modifiedAt,
          children: [],
        });
      }
    }

    const attached = new Set<string>();
    for (const node of map.values()) {
      if (!node.parentId) continue;
      const parent = map.get(node.parentId);
      if (!parent) continue;
      if (!parent.children.some((c) => c.id === node.id)) {
        parent.children.push(node);
      }
      attached.add(node.id);
    }

    // Sort children: folders first, then pages, alphabetically within each group
    for (const node of map.values()) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.title.localeCompare(b.title);
      });
    }

    const roots = [...map.values()].filter((n) => !attached.has(n.id));
    return roots;
  }
}