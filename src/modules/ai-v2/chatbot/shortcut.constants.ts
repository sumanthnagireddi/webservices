export const SHORTCUT_PREFIX = '/';

export const SHORTCUTS = {
  GENERATE: '/generate',
  BLOG: '/blog',
  INTERVIEW: '/interview',
  EXPENSE: '/expense',
  ASK: '/ask',
} as const;

export type ShortcutKey = keyof typeof SHORTCUTS;
export type ShortcutValue = (typeof SHORTCUTS)[ShortcutKey];

export const SHORTCUT_DESCRIPTIONS: Record<ShortcutValue, string> = {
  '/generate': 'Generate content (e.g. /generate React hooks tutorial)',
  '/blog':     'Draft a blog post (e.g. /blog Why TypeScript matters)',
  '/interview':'Generate interview Q&A (e.g. /interview NestJS advanced)',
  '/expense':  'Log an expense (e.g. /expense $45 dinner with client)',
  '/ask':      'Ask a question using RAG (e.g. /ask what is dependency injection)',
};
