import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { AtlassianFolderNode } from './atlassian.interfaces';

export type AtlassianContentDocument = AtlassianContent & Document;

@Schema({
  collection: 'atlassianContent',
  timestamps: true,
})
export class AtlassianContent {
  @Prop({ required: true, unique: true, index: true })
  atlassianId: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  parentType?: string;

  @Prop()
  parentId?: string;

  @Prop()
  spaceId?: string;

  @Prop()
  status?: string;

  @Prop()
  body?: string;

  @Prop()
  bodyRepresentation?: string;

  @Prop({ type: SchemaTypes.Mixed })
  atlasDocFormat?: unknown;

  @Prop()
  versionNumber?: number;

  @Prop()
  webui?: string;

  @Prop()
  editui?: string;

  @Prop()
  edituiv2?: string;

  @Prop()
  tinyui?: string;

  @Prop({ type: Date })
  sourceCreatedAt?: Date;

  @Prop({ type: Date })
  versionCreatedAt?: Date;

  @Prop({ type: [Object], default: [] })
  folderPath?: AtlassianFolderNode[];

  @Prop({ type: Date })
  lastContentSyncAt?: Date;
}

export const AtlassianContentSchema =
  SchemaFactory.createForClass(AtlassianContent);
