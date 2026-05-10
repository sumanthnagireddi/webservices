import { ExpenseCategory } from './expense.model';

export interface BudgetSettings {
  monthlyBudget: number;
  alertThreshold: number; // percentage (e.g. 80 means alert at 80% spent)
}

/** Budget map keyed by month string e.g. '2026-02' */
export type MonthlyBudgetMap = Record<string, BudgetSettings>;

export interface MonthSummary {
  month: string; // e.g. '2026-02'
  totalSpent: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  categoryBreakdown: { category: ExpenseCategory; total: number }[];
}

/** Parsed SMS transaction before user review */
export interface ParsedSmsTransaction {
  id: string;
  rawText: string;
  amount: number;
  merchant: string;
  date: string;
  type: 'debit' | 'credit' | 'unknown';
  category: ExpenseCategory;
  selected: boolean; // user toggle for bulk import
}
