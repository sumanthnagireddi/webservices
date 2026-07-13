import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'confluencePages', timestamps: true })
export class ConfluencePage {
  @Prop({ required: true, unique: true, index: true })
  confluenceId!: string;

  @Prop({ required: true, enum: ['page', 'blogpost'] })
  type!: 'page' | 'blogpost';

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  spaceKey!: string;

  @Prop({ required: true, enum: ['current', 'trashed', 'deleted'] })
  status!: 'current' | 'trashed' | 'deleted';

  @Prop({ type: String, default: null })
  parentId!: string | null;

  @Prop({ type: [String], default: [] })
  ancestorIds!: string[];

  @Prop({ default: '' })
  body!: string;

  @Prop()
  version?: number;

  @Prop()
  versionBy?: string;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  modifiedAt!: Date;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Date })
  syncedAt!: Date;
}

export type ConfluencePageDocument = ConfluencePage & Document;
export const ConfluencePageSchema =
  SchemaFactory.createForClass(ConfluencePage);

@Schema({ collection: 'confluenceFolders', timestamps: true })
export class ConfluenceFolder {
  @Prop({ required: true, unique: true, index: true })
  confluenceId!: string;

  @Prop({ required: true, enum: ['space', 'folder'] })
  type!: 'space' | 'folder';

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  spaceKey!: string;

  @Prop({ type: String, default: null })
  parentId!: string | null;

  @Prop({ required: true, enum: ['active', 'archived', 'deleted'] })
  status!: 'active' | 'archived' | 'deleted';

  @Prop({ type: [String], default: [] })
  childPageIds!: string[];

  @Prop({ type: String, default: null })
  movedFrom?: string | null;

  @Prop({ type: Date })
  modifiedAt!: Date;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Date })
  syncedAt!: Date;
}

export type ConfluenceFolderDocument = ConfluenceFolder & Document;
export const ConfluenceFolderSchema =
  SchemaFactory.createForClass(ConfluenceFolder);

@Schema({ collection: 'syncMeta', timestamps: true })
export class SyncMeta {
  @Prop({ required: true })
  _id!: string;

  @Prop({ type: Date, default: null })
  lastFullSyncAt!: Date | null;

  @Prop({ type: Date, default: null })
  lastIncrementalSyncAt!: Date | null;

  @Prop({ required: true, enum: ['success', 'failed', 'partial'] })
  lastRunStatus!: 'success' | 'failed' | 'partial';

  @Prop()
  lastRunError?: string;

  @Prop({ default: 0 })
  totalPagesSynced!: number;

  @Prop({ default: 0 })
  totalFoldersSynced!: number;
}

export type SyncMetaDocument = SyncMeta & Document;
export const SyncMetaSchema = SchemaFactory.createForClass(SyncMeta);
