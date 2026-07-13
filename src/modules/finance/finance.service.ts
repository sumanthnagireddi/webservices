import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CopyBudgetDto } from './dto/budget/copyBudget.dto';
import { CreateDebtDto } from './dto/finance/create-debt.dto';
import { CreateFinanceDto } from './dto/finance/create-finance.dto';
import { CreateCardDto } from './dto/finance/create-card.dto';
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
        isDeleted: { $ne: true },
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
        isDeleted: { $ne: true },
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

  updateCard(id: string, dto: any) {
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

  // --- New Methods for Next-App Dashboard Integration ---

  // Cards
  getCards(): Promise<Finance[]> {
    return this.financeModel.find({ type: 'card', isDeleted: { $ne: true } }).exec();
  }

  addCard(dto: CreateCardDto): Promise<Finance> {
    return this.financeModel.create({ ...dto, type: 'card' });
  }

  async deleteCard(id: string): Promise<boolean> {
    await this.financeModel.findByIdAndUpdate(id, { isDeleted: true }).exec();
    return true;
  }

  // Personal Expenses
  getPersonalExpenses(): Promise<Finance[]> {
    return this.financeModel.find({ type: 'expense', isDeleted: { $ne: true } }).exec();
  }

  addPersonalExpense(dto: CreateFinanceDto): Promise<Finance> {
    return this.financeModel.create({ ...dto, type: 'expense' });
  }

  async deletePersonalExpense(id: string): Promise<boolean> {
    await this.financeModel.findByIdAndUpdate(id, { isDeleted: true }).exec();
    return true;
  }

  // Personal Target
  async getPersonalTarget(): Promise<number> {
    const budget = await this.financeModel.findOne({ type: 'budget', monthKey: 'global', isDeleted: { $ne: true } }).exec();
    return budget ? budget.monthlyBudget : 10000;
  }

  async updatePersonalTarget(target: number): Promise<number> {
    await this.financeModel.findOneAndUpdate(
      { type: 'budget', monthKey: 'global' },
      { monthlyBudget: target, isDeleted: false },
      { upsert: true, new: true }
    ).exec();
    return target;
  }

  // Construction Expenses
  getConstructionExpenses(): Promise<Finance[]> {
    return this.financeModel.find({ type: 'construction', isDeleted: { $ne: true } }).exec();
  }

  addConstructionExpense(dto: CreateFinanceDto): Promise<Finance> {
    return this.financeModel.create({ ...dto, type: 'construction' });
  }

  async updateConstructionExpenseStatus(id: string, status: string): Promise<boolean> {
    await this.financeModel.findByIdAndUpdate(id, { status }).exec();
    return true;
  }

  async deleteConstructionExpense(id: string): Promise<boolean> {
    await this.financeModel.findByIdAndUpdate(id, { isDeleted: true }).exec();
    return true;
  }

  // Construction Budget
  async getConstructionBudget(): Promise<number> {
    const budget = await this.financeModel.findOne({ type: 'home_budget', monthKey: 'construction-overall', isDeleted: { $ne: true } }).exec();
    return budget ? budget.monthlyBudget : 5000000;
  }

  async updateConstructionBudget(budget: number): Promise<number> {
    await this.financeModel.findOneAndUpdate(
      { type: 'home_budget', monthKey: 'construction-overall' },
      { monthlyBudget: budget, isDeleted: false },
      { upsert: true, new: true }
    ).exec();
    return budget;
  }

  // Debts Ledger
  private mapDebtToFrontend(doc: any) {
    const statusMapped = doc.status === 'settled' || doc.status === 'Paid'
      ? 'Paid'
      : doc.status === 'partial' || doc.status === 'Partial'
      ? 'Partial'
      : 'Pending';

    return {
      id: doc._id || doc.id,
      contactName: doc.name || doc.contactName || '',
      amount: doc.amount,
      type: doc.debtType === 'owed_to_me' ? 'Receivable' : 'Payable',
      dueDate: doc.dueDate || '',
      status: statusMapped,
      notes: doc.notes || doc.description || '',
      paidAmount: doc.paidAmount || 0,
      partialPayments: doc.partialPayments || [],
    };
  }

  async getDebtsLedger(): Promise<any[]> {
    const debts = await this.financeModel.find({ type: 'debt', isDeleted: { $ne: true } }).exec();
    return debts.map(d => this.mapDebtToFrontend(d));
  }

  async addDebtLedger(dto: any): Promise<any> {
    const created = await this.financeModel.create({
      type: 'debt',
      name: dto.contactName,
      amount: dto.amount,
      debtType: dto.type === 'Receivable' ? 'owed_to_me' : 'i_owe',
      dueDate: dto.dueDate,
      status: 'pending',
      notes: dto.notes,
      paidAmount: 0,
      partialPayments: [],
    });
    return this.mapDebtToFrontend(created);
  }

  async editDebtLedger(id: string, dto: any): Promise<any> {
    const debt = await this.financeModel.findById(id).exec();
    if (!debt) throw new NotFoundException('Debt not found');

    const updates: any = {};
    if (dto.contactName !== undefined) updates.name = dto.contactName;
    if (dto.amount !== undefined) updates.amount = dto.amount;
    if (dto.type !== undefined) {
      updates.debtType = dto.type === 'Receivable' ? 'owed_to_me' : 'i_owe';
    }
    if (dto.dueDate !== undefined) updates.dueDate = dto.dueDate;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    const newAmount = dto.amount !== undefined ? dto.amount : debt.amount;
    const currentPaidAmount = debt.paidAmount || 0;

    let newStatus = debt.status;
    if (currentPaidAmount >= newAmount) {
      newStatus = 'settled';
    } else if (currentPaidAmount > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'pending';
    }
    updates.status = newStatus;

    const updated = await this.financeModel.findByIdAndUpdate(id, updates, { new: true }).exec();
    return this.mapDebtToFrontend(updated);
  }

  async updateDebtLedgerStatus(id: string, status: string): Promise<boolean> {
    const debt = await this.financeModel.findById(id).exec();
    if (!debt) throw new NotFoundException('Debt not found');
    const backendStatus = status === 'Paid' ? 'settled' : 'pending';
    const paidAmount = status === 'Paid' ? debt.amount : 0;
    
    const updates: any = { status: backendStatus, paidAmount };
    if (status !== 'Paid') {
      // Reopening debt clears partial payments
      updates.partialPayments = [];
    }
    
    await this.financeModel.findByIdAndUpdate(id, updates).exec();
    return true;
  }

  async deleteDebtLedger(id: string): Promise<boolean> {
    await this.financeModel.findByIdAndUpdate(id, { isDeleted: true }).exec();
    return true;
  }

  async addPartialPayment(id: string, dto: { amount: number, date: string, notes?: string }): Promise<any> {
    const debt = await this.financeModel.findById(id).exec();
    if (!debt) throw new NotFoundException('Debt not found');

    const newPayment = {
      id: new Types.ObjectId().toString(),
      amount: dto.amount,
      date: dto.date,
      notes: dto.notes || '',
    };

    const partialPayments = debt.partialPayments || [];
    partialPayments.push(newPayment);

    const paidAmount = partialPayments.reduce((sum, p) => sum + p.amount, 0);
    let status = 'pending';
    if (paidAmount >= debt.amount) {
      status = 'settled';
    } else if (paidAmount > 0) {
      status = 'partial';
    }

    const updated = await this.financeModel.findByIdAndUpdate(
      id,
      { partialPayments, paidAmount, status },
      { new: true }
    ).exec();
    return this.mapDebtToFrontend(updated);
  }

  async editPartialPayment(id: string, partialId: string, dto: { amount?: number, date?: string, notes?: string }): Promise<any> {
    const debt = await this.financeModel.findById(id).exec();
    if (!debt) throw new NotFoundException('Debt not found');

    const partialPayments = debt.partialPayments || [];
    const index = partialPayments.findIndex(p => p.id === partialId);
    if (index === -1) throw new NotFoundException('Partial payment record not found');

    if (dto.amount !== undefined) partialPayments[index].amount = dto.amount;
    if (dto.date !== undefined) partialPayments[index].date = dto.date;
    if (dto.notes !== undefined) partialPayments[index].notes = dto.notes;

    const paidAmount = partialPayments.reduce((sum, p) => sum + p.amount, 0);
    let status = 'pending';
    if (paidAmount >= debt.amount) {
      status = 'settled';
    } else if (paidAmount > 0) {
      status = 'partial';
    }

    const updated = await this.financeModel.findByIdAndUpdate(
      id,
      { partialPayments, paidAmount, status },
      { new: true }
    ).exec();
    return this.mapDebtToFrontend(updated);
  }

  async deletePartialPayment(id: string, partialId: string): Promise<any> {
    const debt = await this.financeModel.findById(id).exec();
    if (!debt) throw new NotFoundException('Debt not found');

    let partialPayments = debt.partialPayments || [];
    partialPayments = partialPayments.filter(p => p.id !== partialId);

    const paidAmount = partialPayments.reduce((sum, p) => sum + p.amount, 0);
    let status = 'pending';
    if (paidAmount >= debt.amount) {
      status = 'settled';
    } else if (paidAmount > 0) {
      status = 'partial';
    }

    const updated = await this.financeModel.findByIdAndUpdate(
      id,
      { partialPayments, paidAmount, status },
      { new: true }
    ).exec();
    return this.mapDebtToFrontend(updated);
  }

  // Card Billing Calculation
  async getCardBillStatements(targetMonth: string): Promise<any[]> {
    const cards = await this.financeModel.find({ type: 'card', isDeleted: { $ne: true } }).exec();
    const expenses = await this.financeModel.find({ type: 'expense', isDeleted: { $ne: true } }).exec();
    const paidBillsList = await this.financeModel.find({ type: 'card_bill', isDeleted: { $ne: true } }).exec();
    
    const paidBills: Record<string, boolean> = {};
    paidBillsList.forEach(pb => {
      paidBills[`${pb.cardId}_${pb.monthKey}`] = pb.isPaid;
    });

    const year = parseInt(targetMonth.split('-')[0], 10);
    const month = parseInt(targetMonth.split('-')[1], 10); // 1-indexed

    return cards.map(card => {
      const billingDay = card.billingDay;
      const dueDay = card.dueDay;

      // Start date of the cycle is previous month's billingDay + 1
      let startYear = year;
      let startMonth = month - 1;
      if (startMonth === 0) {
        startMonth = 12;
        startYear = year - 1;
      }
      
      const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(billingDay + 1).padStart(2, '0')}`;
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(billingDay).padStart(2, '0')}`;

      // Due date calculation
      let dueYear = year;
      let dueMonth = month;
      
      if (dueDay < billingDay) {
        dueMonth = month + 1;
      }
      if (dueMonth > 12) {
        dueMonth = 1;
        dueYear = year + 1;
      }
      
      const dueDateStr = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

      // Filter transactions that fall within this date range for this card
      const startMs = new Date(startDateStr).getTime();
      const endMs = new Date(endDateStr).getTime();

      const cardTransactions = expenses.filter(exp => {
        if (exp.cardId !== String(card._id)) return false;
        const expMs = new Date(exp.date).getTime();
        return expMs >= startMs && expMs <= endMs;
      }).map(exp => ({
        id: exp._id,
        amount: exp.amount,
        category: exp.category,
        date: exp.date,
        cardId: exp.cardId,
        usedBy: exp.usedBy,
        notes: exp.notes
      }));

      const totalAmount = cardTransactions.reduce((sum, item) => sum + item.amount, 0);
      const billKey = `${card._id}_${targetMonth}`;
      const isPaid = !!paidBills[billKey];

      return {
        cardId: String(card._id),
        cardName: card.name,
        statementMonth: targetMonth,
        startDate: startDateStr,
        endDate: endDateStr,
        dueDate: dueDateStr,
        totalAmount,
        transactions: cardTransactions,
        isPaid
      };
    });
  }

  async markCardBillAsPaid(cardId: string, targetMonth: string, isPaid: boolean): Promise<boolean> {
    await this.financeModel.findOneAndUpdate(
      { type: 'card_bill', cardId, monthKey: targetMonth },
      { type: 'card_bill', cardId, monthKey: targetMonth, isPaid, isDeleted: false },
      { upsert: true, new: true }
    ).exec();
    return true;
  }
}
