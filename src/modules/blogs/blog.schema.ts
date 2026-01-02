import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export enum ContentStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}
export type BlogDocument = Blog & Document;

@Schema({
  collection: 'blogs',
  timestamps: true, // creates createdAt & updatedAt
})
export class Blog {
  /* ---------- Identity ---------- */
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  /* ---------- Core Content ---------- */
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true })
  content: string;

  /* ---------- Author ---------- */
  @Prop({ required: true, index: true })
  authorId: string;

  @Prop()
  authorName?: string;

  @Prop()
  authorAvatarUrl?: string;

  /* ---------- Status & Lifecycle ---------- */
  @Prop({
    type: String,
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
    index: true,
  })
  status: ContentStatus;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  publishedAt?: Date;

  /* ---------- Categorization ---------- */
  @Prop({ type: [String], index: true })
  tags?: string[];

  @Prop({ index: true })
  category?: string;

  /* ---------- Media ---------- */
  @Prop()
  coverImageUrl?: string;

  /* ---------- Engagement ---------- */
  @Prop({ default: 0 })
  viewCount?: number;

  @Prop()
  readingTimeMinutes?: number;

  /* ---------- Moderation ---------- */
  @Prop({ default: false })
  isFeatured?: boolean;

  @Prop({ default: false })
  isPinned?: boolean;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
