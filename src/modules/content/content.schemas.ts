import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type ContentInteractionDocument = ContentInteraction &
  Document & {
    createdAt?: Date;
    updatedAt?: Date;
  };
export type ContentVersionDocument = ContentVersion &
  Document & {
    createdAt?: Date;
    updatedAt?: Date;
  };
export type ContentSyncRunDocument = ContentSyncRun &
  Document & {
    createdAt?: Date;
    updatedAt?: Date;
  };
export type ContentActivityDocument = ContentActivity &
  Document & {
    createdAt?: Date;
    updatedAt?: Date;
  };

@Schema({
  collection: 'contentInteractions',
  timestamps: true,
})
export class ContentInteraction {
  @Prop({ required: true, unique: true, index: true })
  contentId: string;

  @Prop({ default: false })
  starred: boolean;

  @Prop({ type: Date })
  starredAt?: Date;

  @Prop({ type: Date })
  lastReadAt?: Date;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  copyCount: number;

  @Prop({ default: 0 })
  duplicateCount: number;
}

@Schema({
  collection: 'contentVersions',
  timestamps: true,
})
export class ContentVersion {
  @Prop({ required: true, index: true })
  contentId: string;

  @Prop({ required: true })
  versionNumber: number;

  @Prop({ required: true })
  title: string;

  @Prop()
  body?: string;

  @Prop()
  changeSummary?: string;

  @Prop()
  changedBy?: string;

  @Prop({ type: Date })
  changedAt?: Date;

  @Prop({ type: Date, required: true })
  syncedAt: Date;
}

@Schema({
  collection: 'contentSyncRuns',
  timestamps: true,
})
export class ContentSyncRun {
  @Prop({ required: true })
  scope: 'bulk' | 'single-page' | 'folders' | 'pages';

  @Prop({ required: true })
  trigger: 'manual' | 'cron';

  @Prop({ required: true })
  status: 'success' | 'error' | 'skipped';

  @Prop({ default: 0 })
  processed: number;

  @Prop({ default: 0 })
  added: number;

  @Prop({ default: 0 })
  updated: number;

  @Prop({ default: 0 })
  skipped: number;

  @Prop({ default: 0 })
  failed: number;

  @Prop({ type: Date, required: true })
  startedAt: Date;

  @Prop({ type: Date, required: true })
  finishedAt: Date;

  @Prop({ default: 0 })
  durationMs: number;

  @Prop()
  contentId?: string;

  @Prop({ type: [Object], default: [] })
  failures: Array<{ pageId?: string; itemId?: string; message: string }>;
}

@Schema({
  collection: 'contentActivities',
  timestamps: true,
})
export class ContentActivity {
  @Prop({ required: true })
  action: 'read' | 'star' | 'unstar' | 'duplicate' | 'sync' | 'copy-link';

  @Prop()
  contentId?: string;

  @Prop({ type: SchemaTypes.Mixed })
  metadata?: Record<string, unknown>;
}

export const ContentInteractionSchema =
  SchemaFactory.createForClass(ContentInteraction);
export const ContentVersionSchema =
  SchemaFactory.createForClass(ContentVersion);
export const ContentSyncRunSchema = SchemaFactory.createForClass(ContentSyncRun);
export const ContentActivitySchema =
  SchemaFactory.createForClass(ContentActivity);

ContentVersionSchema.index({ contentId: 1, versionNumber: 1 }, { unique: true });
