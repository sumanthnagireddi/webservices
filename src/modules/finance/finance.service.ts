import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFinanceDto } from './dto/finance/create-finance.dto';
import { UpdateFinanceDto } from './dto/finance/update-finance.dto';
import { Finance, FinanceDocument } from './schema/finance.schema';
import { CreateDebtDto } from './dto/finance/create-debt.dto';
import { PartialPaymentDto } from './dto/finance/partial-payment.dto';
import { BudgetDocument } from './schema/budget.schema';

// finance.service.ts
@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(Finance.name)
    private readonly financeModel: Model<FinanceDocument>,
  ) {}

  // ── EXPENSES ──────────────────────────────────────────

  create(dto: CreateFinanceDto): Promise<Finance> {
    const { type } = dto;
    return this.financeModel.create({ ...dto, type: type || 'expense' });
  }

  findAllExpensesPerMonth(
    year: number,
    month: number,
    type?: string,
  ): Promise<Finance[]> {
    if (type === 'construction') {
      return this.financeModel
        .find({ type: 'construction', isDeleted: false })
        .sort({ date: -1 })
        .exec();
    }

    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    return this.financeModel
      .find({
        type: type || 'expense',
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

  addExpenses(expenses: CreateFinanceDto[]): Promise<Finance[]> {
    const withType = expenses.map((e) => ({ ...e, type: 'expense' }));
    return this.financeModel.insertMany(withType) as Promise<Finance[]>;
  }

  // ── DEBTS ─────────────────────────────────────────────

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

  // ── BUDGET ────────────────────────────────────────────

  async getBudgetForMonth(monthKey: string, type?: string) {
    if (type === 'home_budget') {
      const all = await this.financeModel
        .find({ type: 'home_budget', isDeleted: false })
        .exec();
      const totalSpent = all.reduce((sum, e) => sum + (e.monthlyBudget ?? 0), 0);
      return { monthlyBudget: totalSpent, alertThreshold: 80 };
    }

    const budget = await this.financeModel
      .findOne({ type: type || 'budget', monthKey })
      .exec();
    return budget ?? { monthlyBudget: 0, alertThreshold: 80 };
  }

  async saveBudgetForMonth(
    monthKey: string,
    settings: { monthlyBudget: number; alertThreshold: number },
  ) {
    return this.financeModel
      .findOneAndUpdate(
        { type: 'budget', monthKey },
        { ...settings, type: 'budget', monthKey },
        { upsert: true, new: true },
      )
      .exec();
  }

  async copyBudgetToMonth(fromKey: string, toKey: string) {
    const from = await this.getBudgetForMonth(fromKey);
    return this.saveBudgetForMonth(toKey, {
      monthlyBudget: from.monthlyBudget,
      alertThreshold: from.alertThreshold ?? 80,
    });
  }

  // ── GET DEBTS BY TYPE ─────────────────────────────────
  findDebtsByType(debtType: 'owed_to_me' | 'i_owe'): Promise<Finance[]> {
    return this.financeModel
      .find({ type: 'debt', debtType, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ── GET SETTLED DEBTS ─────────────────────────────────
  findSettledDebts(): Promise<Finance[]> {
    return this.financeModel
      .find({ type: 'debt', status: 'settled', isDeleted: false })
      .sort({ updatedAt: -1 })
      .exec();
  }

  // ── GET SINGLE DEBT ───────────────────────────────────
  findOneDebt(id: string): Promise<Finance | null> {
    return this.financeModel.findById(id).exec();
  }

  // ── MARK AS SETTLED ───────────────────────────────────
  async markDebtSettled(id: string): Promise<Finance | null> {
    const debt = await this.financeModel.findById(id).exec();
    if (!debt) throw new Error('Debt not found');
    return this.financeModel
      .findByIdAndUpdate(
        id,
        { status: 'settled', paidAmount: debt.amount },
        { new: true },
      )
      .exec();
  }

  // ── RECORD PARTIAL PAYMENT ────────────────────────────
  async recordPartialPayment(
    id: string,
    dto: PartialPaymentDto,
  ): Promise<Finance | null> {
    const debt = await this.financeModel.findById(id).exec();
    if (!debt) throw new Error('Debt not found');

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

  // ── DEBT SUMMARY ──────────────────────────────────────
  async getDebtSummary() {
    const debts = await this.financeModel
      .find({ type: 'debt', isDeleted: false, status: { $ne: 'settled' } })
      .exec();

    const totalOwedToMe = debts
      .filter((d) => d.debtType === 'owed_to_me')
      .reduce((sum, d) => sum + (d.amount - (d.paidAmount ?? 0)), 0);

    const totalIOwe = debts
      .filter((d) => d.debtType === 'i_owe')
      .reduce((sum, d) => sum + (d.amount - (d.paidAmount ?? 0)), 0);

    return {
      totalOwedToMe,
      totalIOwe,
      netBalance: totalOwedToMe - totalIOwe,
      totalPending: debts.filter((d) => d.status === 'pending').length,
      totalPartial: debts.filter((d) => d.status === 'partial').length,
    };
  }
  async migrateExistingData() {
    // const budgets = await this.budgetModel.find().exec();
    // if (budgets.length === 0) {
    //   return { message: 'No budgets to migrate', migrated: 0 };
    // }
    // // Insert each budget into finance collection with type: 'budget'
    // const budgetDocs = budgets.map((b) => ({
    //   type: 'budget',
    //   monthKey: b.monthKey,
    //   monthlyBudget: b.monthlyBudget,
    //   alertThreshold: b.alertThreshold ?? 80,
    //   isDeleted: false,
    // }));
    // await this.financeModel.insertMany(budgetDocs);
    // return {
    //   message: 'Budgets migrated successfully',
    //   migrated: budgets.length,
    //   data: budgetDocs,
    // };
  }
}
