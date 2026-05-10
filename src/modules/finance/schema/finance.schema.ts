import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FinanceDocument = Finance & Document;

export type FinanceType =
  | 'expense'
  | 'debt'
  | 'budget'
  | 'income'
  | 'construction'
  | 'home_budget';

export const FINANCE_TYPES = [
  'expense',
  'debt',
  'budget',
  'income',
  'construction',
  'home_budget',
] as const satisfies readonly FinanceType[];

export function isFinanceType(value: string | undefined): value is FinanceType {
  return (
    typeof value === 'string' && FINANCE_TYPES.includes(value as FinanceType)
  );
}

@Schema({ collection: 'finance', timestamps: true })
export class Finance {
  @Prop({
    required: true,
    enum: FINANCE_TYPES,
    default: 'expense',
  })
  type: FinanceType;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  title: string;

  @Prop()
  amount: number;

  @Prop()
  category: string;

  @Prop()
  date: string;

  @Prop()
  notes: string;

  @Prop()
  source: string;

  @Prop()
  cardType: string;

  @Prop()
  name: string;

  @Prop()
  debtType: string;

  @Prop()
  status: string;

  @Prop()
  paidAmount: number;

  @Prop()
  description: string;

  @Prop()
  dueDate: string;

  @Prop()
  monthKey: string;

  @Prop()
  monthlyBudget: number;

  @Prop()
  alertThreshold: number;
}

export const FinanceSchema = SchemaFactory.createForClass(Finance);

FinanceSchema.index({ type: 1 });
FinanceSchema.index({ type: 1, date: 1 });
FinanceSchema.index({ type: 1, monthKey: 1 }, { unique: false });
FinanceSchema.index({ type: 1, status: 1 });
