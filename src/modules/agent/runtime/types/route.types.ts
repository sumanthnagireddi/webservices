// route.types.ts
export const ROUTE_REGISTRY = {
  // ── Conversational ────────────────────────────────────────────────
  chat: {
    description:
      'Casual conversation, greetings, or anything that does not fit other routes',
  },
  question: {
    description:
      'General questions, explanations, "how does X work", conceptual help, interview prep queries',
  },

  // ── Data Retrieval ────────────────────────────────────────────────
  'data-fetch': {
    description:
      'Retrieving, listing, searching, or fetching existing records. Keywords: fetch, get, list, show, find, retrieve, search, give me, what are my',
  },

  // ── Blog ──────────────────────────────────────────────────────────
  'blog-creation': {
    description:
      'Creating a brand new blog post or article that does not exist yet',
  },
  'blog-update': {
    description:
      'Editing, modifying, or updating an existing blog post, title, content, or status',
  },

  // ── Content ───────────────────────────────────────────────────────
  'content-creation': {
    description:
      'Creating new content pages, articles, or learning material under a technology or topic',
  },
  'content-update': {
    description:
      'Updating, publishing, archiving, or editing existing content entries',
  },

  // ── Finance ───────────────────────────────────────────────────────
  'finance-transaction': {
    description:
      'Adding, recording, or updating a financial expense or transaction. Keywords: expense, spent, paid, charged, cost, amount, transaction, finance',
  },
  'finance-fetch': {
    description:
      'Fetching finance stats, listing expenses, or querying transaction history',
  },

  // ── Resources ─────────────────────────────────────────────────────
  'resource-creation': {
    description:
      'Adding a new learning resource, tutorial, guide, or reference link',
  },
  'resource-fetch': {
    description: 'Fetching, listing, or searching existing learning resources',
  },

  // ── Snippets ──────────────────────────────────────────────────────
  'snippet-creation': {
    description: 'Saving or creating a new code snippet',
  },
  'snippet-fetch': {
    description: 'Fetching, searching, or listing saved code snippets',
  },

  // ── Document Generation ───────────────────────────────────────────
  'document-generation': {
    description:
      'Generating, exporting, or producing a NEW report, PDF, or structured document that does not exist yet. Only for file creation, never for fetching existing data.',
  },

  // ── RAG / AI Q&A ─────────────────────────────────────────────────
  'rag-query': {
    description:
      'Questions that require searching the knowledge base, vector DB, or indexed content to answer. Keywords: based on my content, from my notes, in my knowledge base, search my docs',
  },
} as const;

export type RouteType = keyof typeof ROUTE_REGISTRY;

export interface RouteDecision {
  route: RouteType;
  confidence: number;
  reasoning: string;
  alternativeRoute?: RouteType;
  needsClarification: boolean;
}
