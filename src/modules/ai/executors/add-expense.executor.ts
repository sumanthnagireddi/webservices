import { Injectable } from '@nestjs/common';
import { FinanceService } from 'src/modules/finance/finance.service';

@Injectable()
export class AddExpenseExecutor {
  constructor(private financeService: FinanceService) {}

  async execute(args: {
    amount: number;
    merchant: string;
    category: string;
    date: string;
    notes?: string;
    is_refund?: boolean;
  }) {
    // Map LLM args → your existing CreateFinanceDto shape
    return this.financeService.create({
      title: args.merchant,
      amount: args.amount,
      category: args.category,
      date: args.date,
      cardType: 'Cash', // default — LLM doesn't know card type
      type: 'expense', // refund = income, else expense
      notes: args.notes ?? '',
    });
  }
}
