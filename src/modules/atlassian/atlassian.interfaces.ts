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
