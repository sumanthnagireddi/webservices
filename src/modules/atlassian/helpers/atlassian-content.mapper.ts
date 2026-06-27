import { CreateAtlassianContentDto } from '../dto/create-atlassian-content.dto';
import {
  AtlassianFolderNode,
  AtlassianPageSummary,
} from '../atlassian.interfaces';

export interface AtlassianContentPersistenceInput {
  atlassianId: string;
  title: string;
  parentType?: string;
  parentId?: string;
  spaceId?: string;
  status?: string;
  authorName?: string;
  body?: string;
  bodyRepresentation?: string;
  atlasDocFormat?: unknown;
  versionNumber?: number;
  webui?: string;
  editui?: string;
  edituiv2?: string;
  tinyui?: string;
  sourceCreatedAt?: Date;
  versionCreatedAt?: Date;
  folderPath?: AtlassianFolderNode[];
  lastContentSyncAt?: Date;
}

export function mapAtlassianContentPayload(
  payload: CreateAtlassianContentDto,
  siteUrl?: string,
  folderPath: AtlassianFolderNode[] = [],
): AtlassianContentPersistenceInput {
  const bodyRecord = asRecord(payload.body);
  const storageBody = asRecord(bodyRecord?.storage);
  const atlasDocBody = bodyRecord?.atlas_doc_format;

  return {
    atlassianId: payload.id ?? payload.atlassianId,
    title: payload.title,
    parentType: payload.parentType,
    parentId: payload.parentId,
    spaceId: payload.spaceId,
    status: payload.status,
    authorName: extractAuthorName(payload),
    body: extractBodyText(
      getStringValue(storageBody?.value),
      asRecord(atlasDocBody),
    ),
    bodyRepresentation:
      getStringValue(storageBody?.representation) ??
      (atlasDocBody ? 'atlas_doc_format' : undefined),
    atlasDocFormat: atlasDocBody,
    versionNumber: payload.version?.number,
    webui: buildAbsoluteLink(siteUrl, payload._links?.webui),
    editui: buildAbsoluteLink(siteUrl, payload._links?.editui),
    edituiv2: buildAbsoluteLink(siteUrl, payload._links?.edituiv2),
    tinyui: buildAbsoluteLink(siteUrl, payload._links?.tinyui),
    sourceCreatedAt: parseIsoDate(payload.createdAt),
    versionCreatedAt: parseIsoDate(payload.version?.createdAt),
    folderPath,
  };
}

export function mapAtlassianPageResponse(
  payload: AtlassianPageSummary & { body?: Record<string, unknown> },
  siteUrl?: string,
  folderPath: AtlassianFolderNode[] = [],
  syncedAt = new Date(),
): AtlassianContentPersistenceInput {
  const storageBody = asRecord(payload.body?.storage);
  const atlasDocBody = asRecord(payload.body?.atlas_doc_format);

  return {
    atlassianId: payload.id,
    title: payload.title,
    parentType: payload.parentType ?? undefined,
    parentId: payload.parentId ?? undefined,
    spaceId: payload.spaceId,
    status: payload.status,
    authorName: extractAuthorName(payload),
    body: extractBodyText(storageBody?.value, atlasDocBody),
    bodyRepresentation:
      getStringValue(storageBody?.representation) ??
      (atlasDocBody ? 'atlas_doc_format' : undefined),
    atlasDocFormat: atlasDocBody ?? payload.body?.atlas_doc_format,
    versionNumber: payload.version?.number,
    webui: buildAbsoluteLink(siteUrl, payload._links?.webui),
    editui: buildAbsoluteLink(siteUrl, payload._links?.editui),
    edituiv2: buildAbsoluteLink(siteUrl, payload._links?.edituiv2),
    tinyui: buildAbsoluteLink(siteUrl, payload._links?.tinyui),
    sourceCreatedAt: parseIsoDate(payload.createdAt),
    versionCreatedAt: parseIsoDate(payload.version?.createdAt),
    folderPath,
    lastContentSyncAt: syncedAt,
  };
}

function buildAbsoluteLink(
  siteUrl?: string,
  path?: string,
): string | undefined {
  if (!path) {
    return undefined;
  }

  if (!siteUrl || /^https?:\/\//i.test(path)) {
    return path;
  }

  return `${siteUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function parseIsoDate(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}

function extractBodyText(
  storageValue?: unknown,
  atlasDocBody?: Record<string, unknown>,
): string | undefined {
  if (typeof storageValue === 'string') {
    return storageValue;
  }

  const atlasDocValue = atlasDocBody?.value;
  if (typeof atlasDocValue === 'string') {
    return atlasDocValue;
  }

  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getStringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function extractAuthorName(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    (record['version'] as Record<string, unknown> | undefined)?.['author'],
    (record['author'] as Record<string, unknown> | undefined)?.['displayName'],
    (record['history'] as Record<string, unknown> | undefined)?.['createdBy'],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }

    if (
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      typeof (candidate as Record<string, unknown>)['displayName'] === 'string'
    ) {
      return String(
        (candidate as Record<string, unknown>)['displayName'],
      ).trim();
    }
  }

  return undefined;
}
