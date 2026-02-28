// finance.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FinanceDocument = Finance & Document;

export type FinanceType =
  | 'expense'
  | 'debt'
  | 'budget'
  | 'income'
  | 'construction'; // add future types here

@Schema({ collection: 'finance', timestamps: true })
export class Finance {
  // ── COMMON ──────────────────────────────
  @Prop({
    required: true,
    enum: ['expense', 'debt', 'budget', 'income', 'construction'],
    default: 'expense',
  })
  type: FinanceType;

  @Prop({ default: false })
  isDeleted: boolean;

  // ── EXPENSE fields ───────────────────────
  @Prop() title: string;
  @Prop() amount: number;
  @Prop() category: string;
  @Prop() date: string; // YYYY-MM-DD
  @Prop() notes: string;
  @Prop() source: string; // 'manual' | 'sms'
  @Prop() cardType: string;

  // ── DEBT fields ──────────────────────────
  @Prop() name: string; // person's name
  @Prop() debtType: string; // 'owed_to_me' | 'i_owe'
  @Prop() status: string; // 'pending' | 'partial' | 'settled'
  @Prop() paidAmount: number;
  @Prop() description: string;
  @Prop() dueDate: string;

  // ── BUDGET fields ────────────────────────
  @Prop() monthKey: string; // '2026-02'
  @Prop() monthlyBudget: number;
  @Prop() alertThreshold: number;
}

export const FinanceSchema = SchemaFactory.createForClass(Finance);

// Indexes for fast queries
FinanceSchema.index({ type: 1 });
FinanceSchema.index({ type: 1, date: 1 });
FinanceSchema.index({ type: 1, monthKey: 1 }, { unique: false });
FinanceSchema.index({ type: 1, status: 1 });
