export interface AtlassianFolderNode {
  id: string;
  label: string;
  type: string;
  hasItems: boolean;
  isOpen: boolean;
  icon: string;
  children?: AtlassianFolderNode[];
}

export interface AtlassianFolderVersion {
  number?: number;
  message?: string;
  createdAt?: string;
}

export interface AtlassianFolderSummary {
  id: string;
  title: string;
  label: string;
  type: string;
  parentId?: string | null;
  parentType?: string | null;
  spaceId?: string;
  status?: string;
  createdAt?: string;
  version?: AtlassianFolderVersion;
  _links?: {
    webui?: string;
  };
  hasItems: boolean;
  isOpen: boolean;
}

export interface AtlassianPageVersion {
  number?: number;
  message?: string;
  createdAt?: string;
}

export interface AtlassianPageSummary {
  id: string;
  title: string;
  parentId?: string | null;
  parentType?: string | null;
  spaceId?: string;
  status?: string;
  createdAt?: string;
  version?: AtlassianPageVersion;
  _links?: {
    webui?: string;
    editui?: string;
    edituiv2?: string;
    tinyui?: string;
  };
}

export interface AtlassianPageSyncFailure {
  pageId: string;
  message: string;
}

export interface AtlassianPageSyncReport {
  trigger: 'cron' | 'manual';
  processed: number;
  synced: number;
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  startedAt: string;
  finishedAt: string;
  failures: AtlassianPageSyncFailure[];
}

export interface AtlassianFolderSyncReport {
  trigger: 'cron' | 'manual';
  discovered: number;
  inserted: number;
  skippedExisting: number;
  startedAt: string;
  finishedAt: string;
  insertedIds: string[];
}

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
  childPageIds: string[];
  movedFrom?: string | null; // previous parentId if moved
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

export type ChangeType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'moved'
  | 'archived';

export interface ConfluenceApiPage {
  id: string;
  type: string;
  title: string;
  status: string;
  space: { key: string };
  version: { number: number; when: string; by: { displayName: string } };
  ancestors: Array<{ id: string }>;
  body?: { storage: { value: string } };
  children?: {
    page?: {
      results?: Array<{ id: string }>;
    };
  };
}

export interface ConfluenceApiSpace {
  key: string;
  name: string;
  type: string;
  status: string;
}

export interface ChangeResult {
  changeType: ChangeType;
  entityType: 'page' | 'folder' | 'space';
  id: string;
  title: string;
}
