/* =========================================================
   BLOG MODELS
   ========================================================= */

import { ContentStatus } from './content.model';

export interface Blog {
  /* ---------- Identity ---------- */
  id: string;
  slug: string;

  /* ---------- Core Content ---------- */
  title: string;
  description?: string;
  content: string;

  /* ---------- Author ---------- */
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string;

  /* ---------- Status & Lifecycle ---------- */
  status: ContentStatus; // DRAFT | REVIEW | PUBLISHED | ARCHIVED
  isActive: boolean;
  publishedAt?: string;

  /* ---------- Categorization ---------- */
  tags?: string[];
  category?: string;

  /* ---------- Media ---------- */
  coverImageUrl?: string;

  /* ---------- Engagement ---------- */
  viewCount?: number;
  readingTimeMinutes?: number;

  /* ---------- Moderation ---------- */
  isFeatured?: boolean;
  isPinned?: boolean;

  /* ---------- Audit ---------- */
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  /* ---------- Identity ---------- */
  id: string;
  blogId: string;
  slug: string;

  /* ---------- Core Content ---------- */
  title: string;
  summary?: string;
  content: string;

  /* ---------- Author ---------- */
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string;

  /* ---------- Status & Lifecycle ---------- */
  status: ContentStatus; // DRAFT | REVIEW | PUBLISHED | ARCHIVED
  isActive: boolean;
  publishedAt?: string;

  /* ---------- Categorization ---------- */
  tags?: string[];
  category?: string;

  /* ---------- Media ---------- */
  coverImageUrl?: string;

  /* ---------- Engagement & Analytics ---------- */
  viewCount?: number;
  readingTimeMinutes?: number;

  /* ---------- Moderation ---------- */
  isFeatured?: boolean;
  isPinned?: boolean;

  /* ---------- Audit ---------- */
  createdAt: string;
  updatedAt: string;
}
