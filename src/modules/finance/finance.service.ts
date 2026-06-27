import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CopyBudgetDto } from './dto/budget/copyBudget.dto';
import { CreateDebtDto } from './dto/finance/create-debt.dto';
import { CreateFinanceDto } from './dto/finance/create-finance.dto';
import { PartialPaymentDto } from './dto/finance/partial-payment.dto';
import { UpdateFinanceDto } from './dto/finance/update-finance.dto';
import {
  Finance,
  FinanceDocument,
  FinanceType,
} from './schema/finance.schema';

type BudgetSettings = {
  monthlyBudget: number;
  alertThreshold: number;
};

type ExpenseMode = Extract<FinanceType, 'expense' | 'construction'>;
type BudgetMode = Extract<FinanceType, 'budget' | 'home_budget'>;

type FinanceCategoryBreakdown = {
  category: string;
  total: number;
};

export type FinanceDashboard = {
  monthKey: string;
  expenseType: ExpenseMode;
  budgetType: BudgetMode;
  budget: BudgetSettings;
  expenses: Finance[];
  summary: {
    totalSpent: number;
    budget: number;
    remaining: number;
    percentUsed: number;
    totalTransactions: number;
    categoryBreakdown: FinanceCategoryBreakdown[];
  };
};

const DEFAULT_BUDGET: BudgetSettings = {
  monthlyBudget: 0,
  alertThreshold: 80,
};

const CONSTRUCTION_BUDGET_KEY = 'construction-overall';

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(Finance.name)
    private readonly financeModel: Model<FinanceDocument>,
  ) {}

  create(dto: CreateFinanceDto, type?: FinanceType): Promise<Finance> {
    const resolvedType = this.resolveExpenseType(type ?? dto.type);

    return this.financeModel.create({
      ...dto,
      type: resolvedType,
    });
  }

  findAllExpenses(type?: FinanceType): Promise<Finance[]> {
    const resolvedType = this.resolveExpenseType(type);

    return this.financeModel
      .find({
        type: resolvedType,
        isDeleted: false,
      })
      .sort({ date: -1 })
      .exec();
  }

  findAllExpensesPerMonth(
    year: number,
    month: number,
    type?: FinanceType,
  ): Promise<Finance[]> {
    const resolvedType = this.resolveExpenseType(type);
    if (resolvedType === 'construction') {
      return this.findAllExpenses(resolvedType);
    }

    const { startStr, endStr } = this.getMonthRange(year, month);

    return this.financeModel
      .find({
        type: resolvedType,
        isDeleted: false,
        date: { $gte: startStr, $lte: endStr },
      })
      .sort({ date: -1 })
      .exec();
  }

  findOne(id: string) {
    return this.financeModel.findById(id).exec();
  }

  update(id: string, dto: UpdateFinanceDto) {
    return this.financeModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  remove(id: string) {
    return this.financeModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec();
  }

  addExpenses(expenses: CreateFinanceDto[], type?: FinanceType): Promise<Finance[]> {
    const resolvedType = this.resolveExpenseType(type);
    const withType = expenses.map((expense) => ({
      ...expense,
      type: resolvedType,
    }));
    return this.financeModel.insertMany(withType) as Promise<Finance[]>;
  }

  findAllDebts(): Promise<Finance[]> {
    return this.financeModel
      .find({ type: 'debt', isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  createDebt(dto: CreateDebtDto): Promise<Finance> {
    return this.financeModel.create({
      ...dto,
      type: 'debt',
      paidAmount: 0,
      status: 'pending',
    });
  }

  updateDebt(id: string, dto: Partial<CreateDebtDto>) {
    return this.financeModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  removeDebt(id: string) {
    return this.financeModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec();
  }

  async getBudgetForMonth(monthKey: string, type?: FinanceType) {
    const budgetType = this.resolveBudgetType(type);
    const resolvedMonthKey = this.resolveBudgetMonthKey(monthKey, budgetType);
    const budget = await this.financeModel
      .findOne({ type: budgetType, monthKey: resolvedMonthKey, isDeleted: false })
      .exec();

    return budget ?? DEFAULT_BUDGET;
  }

  async saveBudgetForMonth(
    monthKey: string,
    settings: BudgetSettings,
    type?: FinanceType,
  ) {
    const budgetType = this.resolveBudgetType(type);
    const resolvedMonthKey = this.resolveBudgetMonthKey(monthKey, budgetType);
    return this.financeModel
      .findOneAndUpdate(
        { type: budgetType, monthKey: resolvedMonthKey },
        {
          ...settings,
          type: budgetType,
          monthKey: resolvedMonthKey,
          isDeleted: false,
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async copyBudgetToMonth(
    fromKey: CopyBudgetDto['fromKey'],
    toKey: CopyBudgetDto['toKey'],
    type?: FinanceType,
  ) {
    const from = await this.getBudgetForMonth(fromKey, type);
    return this.saveBudgetForMonth(
      toKey,
      {
        monthlyBudget: from.monthlyBudget,
        alertThreshold: from.alertThreshold ?? DEFAULT_BUDGET.alertThreshold,
      },
      type,
    );
  }

  async getDashboard(
    year: number,
    month: number,
    type?: FinanceType,
  ): Promise<FinanceDashboard> {
    const expenseType = this.resolveExpenseType(type);
    const budgetType = this.getBudgetTypeForExpenseMode(expenseType);
    const monthKey = this.getMonthKey(year, month);
    const isConstructionMode = expenseType === 'construction';
    const budgetKey = this.resolveBudgetMonthKey(monthKey, budgetType);

    const [expenses, budget] = await Promise.all([
      isConstructionMode
        ? this.findAllExpenses(expenseType)
        : this.findAllExpensesPerMonth(year, month, expenseType),
      this.getBudgetForMonth(budgetKey, budgetType),
    ]);

    return {
      monthKey: budgetKey,
      expenseType,
      budgetType,
      budget,
      expenses,
      summary: this.summarizeExpenses(expenses, budget),
    };
  }

  findDebtsByType(debtType: 'owed_to_me' | 'i_owe'): Promise<Finance[]> {
    return this.financeModel
      .find({ type: 'debt', debtType, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  findSettledDebts(): Promise<Finance[]> {
    return this.financeModel
      .find({ type: 'debt', status: 'settled', isDeleted: false })
      .sort({ updatedAt: -1 })
      .exec();
  }

  findOneDebt(id: string): Promise<Finance | null> {
    return this.financeModel.findById(id).exec();
  }

  async markDebtSettled(id: string): Promise<Finance | null> {
    const debt = await this.financeModel.findById(id).exec();
    if (!debt) {
      throw new NotFoundException('Debt not found');
    }

    return this.financeModel
      .findByIdAndUpdate(
        id,
        { status: 'settled', paidAmount: debt.amount },
        { new: true },
      )
      .exec();
  }

  async recordPartialPayment(
    id: string,
    dto: PartialPaymentDto,
  ): Promise<Finance | null> {
    const debt = await this.financeModel.findById(id).exec();
    if (!debt) {
      throw new NotFoundException('Debt not found');
    }

    const newPaid = Math.min((debt.paidAmount ?? 0) + dto.amount, debt.amount);
    const newStatus = newPaid >= debt.amount ? 'settled' : 'partial';

    return this.financeModel
      .findByIdAndUpdate(
        id,
        { paidAmount: newPaid, status: newStatus },
        { new: true },
      )
      .exec();
  }

  async getDebtSummary() {
    const debts = await this.financeModel
      .find({ type: 'debt', isDeleted: false, status: { $ne: 'settled' } })
      .exec();

    const totalOwedToMe = debts
      .filter((debt) => debt.debtType === 'owed_to_me')
      .reduce((sum, debt) => sum + (debt.amount - (debt.paidAmount ?? 0)), 0);

    const totalIOwe = debts
      .filter((debt) => debt.debtType === 'i_owe')
      .reduce((sum, debt) => sum + (debt.amount - (debt.paidAmount ?? 0)), 0);

    return {
      totalOwedToMe,
      totalIOwe,
      netBalance: totalOwedToMe - totalIOwe,
      totalPending: debts.filter((debt) => debt.status === 'pending').length,
      totalPartial: debts.filter((debt) => debt.status === 'partial').length,
    };
  }

  private resolveExpenseType(type?: string): ExpenseMode {
    return type === 'construction' ? 'construction' : 'expense';
  }

  private resolveBudgetType(type?: string): BudgetMode {
    return type === 'home_budget' ? 'home_budget' : 'budget';
  }

  private getBudgetTypeForExpenseMode(type: ExpenseMode): BudgetMode {
    return type === 'construction' ? 'home_budget' : 'budget';
  }

  private resolveBudgetMonthKey(monthKey: string, type: BudgetMode): string {
    return type === 'home_budget' ? CONSTRUCTION_BUDGET_KEY : monthKey;
  }

  private getMonthRange(year: number, month: number) {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(
      endDate.getDate(),
    ).padStart(2, '0')}`;

    return { startStr, endStr };
  }

  private getMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private summarizeExpenses(
    expenses: Finance[],
    budget: BudgetSettings,
  ): FinanceDashboard['summary'] {
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const budgetAmount = budget.monthlyBudget ?? 0;
    const remaining = budgetAmount - totalSpent;
    const percentUsed =
      budgetAmount > 0 ? Math.round((totalSpent / budgetAmount) * 100) : 0;

    const categoryTotals = expenses.reduce<Record<string, number>>(
      (totals, expense) => {
        const key = expense.category || 'other';
        totals[key] = (totals[key] ?? 0) + expense.amount;
        return totals;
      },
      {},
    );

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, total]) => ({ category, total }))
      .sort((left, right) => right.total - left.total);

    return {
      totalSpent,
      budget: budgetAmount,
      remaining,
      percentUsed,
      totalTransactions: expenses.length,
      categoryBreakdown,
    };
  }
}
