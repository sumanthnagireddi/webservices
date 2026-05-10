export type ExpenseCategory =
  | 'food'
  | 'groceries'
  | 'transport'
  | 'entertainment'
  | 'shopping'
  | 'bills'
  | 'health'
  | 'education'
  | 'rent'
  | 'subscriptions'
  | 'other';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // ISO date string
  notes?: string;
  source?: 'manual' | 'sms'; // track origin
  createdAt: string; // ISO timestamp
  cardType?: string; // e.g., 'credit', 'debit', 'cash'
}
