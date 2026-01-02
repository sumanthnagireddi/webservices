export type ContentStatus = 'draft' | 'published';

export interface Content {
  id: string; // Firestore document ID
  title: string;
  body: string; // HTML / Markdown
  technologyId: string; // angular, react
  topicId: string; // ngrx, hooks
  authorId: string;

  status: ContentStatus; // draft | published

  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
  publishedAt?: any | null; // Only when published

  isDeleted?: boolean; // Soft delete (optional)
}

export interface Technology {
  _id: string; // angular
  name: string; // Angular
  icon?: string; // article
  order: number;
  description?: string;
  topics?: any;
}

export interface Topic {
  id: string; // ngrx
  name: string; // NgRx
  technologyId: string; // angular
  order: number;
}

export interface UserActivity {
  userId: string;

  starred: Record<string, boolean>;

  recentlyVisited: Record<string, any>;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  url?: string;

  hasItems?: boolean;
  isOpen?: boolean;

  children?: SidebarItem[];
}

export interface ForYouSection {
  recentlyVisited: Content[];
  recommended: Content[];
}

export interface RecentContent {
  items: Content[];
  lastVisible?: any; // Pagination cursor
}

export interface StarredContent {
  contentIds: string[];
  items: Content[];
}

export interface DraftContent {
  items: Content[];
}

export interface CreateContentDto {
  title: string;
  body: string;
  technologyId: string;
  topicId: string;
  authorId: string;
  status: ContentStatus;
}

export interface UpdateContentDto {
  title?: string;
  body?: string;
  status?: ContentStatus;
  updatedAt?: any;
  publishedAt?: any | null;
}
