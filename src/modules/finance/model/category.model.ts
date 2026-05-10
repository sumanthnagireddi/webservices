import { ExpenseCategory } from './expense.model';

export interface CategoryConfig {
  key: ExpenseCategory;
  label: string;
  icon: string;
  color: string; // Tailwind bg class
  textColor: string; // Tailwind text class
}
