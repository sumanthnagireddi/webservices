import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AtlassianFolderNode } from './atlassian.interfaces';

export type AtlassianFolderDocument = AtlassianFolder & Document;

@Schema({
  collection: 'atlassianFolders',
  timestamps: true,
})
export class AtlassianFolder {
  @Prop({ required: true, unique: true, index: true })
  atlassianId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  type?: string;

  @Prop()
  parentId?: string;

  @Prop()
  parentType?: string;

  @Prop()
  spaceId?: string;

  @Prop()
  status?: string;

  @Prop()
  webui?: string;

  @Prop({ type: Date })
  sourceCreatedAt?: Date;

  @Prop()
  versionNumber?: number;

  @Prop({ type: Date })
  versionCreatedAt?: Date;

  @Prop({ type: [Object], default: [] })
  folderPath?: AtlassianFolderNode[];

  @Prop({ type: Date })
  lastFolderSyncAt?: Date;
}

export const AtlassianFolderSchema =
  SchemaFactory.createForClass(AtlassianFolder);
