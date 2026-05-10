import { Injectable } from '@nestjs/common';
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
  isFinanceType,
} from './schema/finance.schema';

type BudgetSettings = {
  monthlyBudget: number;
  alertThreshold: number;
};

@Injectable()
export class FinanceService {
  constructor(
    @InjectModel(Finance.name)
    private readonly financeModel: Model<FinanceDocument>,
  ) {}

  create(dto: CreateFinanceDto): Promise<Finance> {
    const resolvedType = isFinanceType(dto.type) ? dto.type : 'expense';

    return this.financeModel.create({
      ...dto,
      type: resolvedType,
    });
  }

  findAllExpensesPerMonth(
    year: number,
    month: number,
    type?: FinanceType,
  ): Promise<Finance[]> {
    if (type === 'construction') {
      return this.financeModel
        .find({ type: 'construction', isDeleted: false })
        .sort({ date: -1 })
        .exec();
    }

    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(
      endDate.getDate(),
    ).padStart(2, '0')}`;

    return this.financeModel
      .find({
        type: type ?? 'expense',
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
    const withType = expenses.map((expense) => ({
      ...expense,
      type: 'expense' as const,
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
    if (type === 'home_budget') {
      const all = await this.financeModel
        .find({ type: 'home_budget', isDeleted: false })
        .exec();

      const totalSpent = all.reduce(
        (sum, entry) => sum + (entry.monthlyBudget ?? 0),
        0,
      );

      return { monthlyBudget: totalSpent, alertThreshold: 80 };
    }

    const budget = await this.financeModel
      .findOne({ type: type ?? 'budget', monthKey })
      .exec();

    return budget ?? { monthlyBudget: 0, alertThreshold: 80 };
  }

  async saveBudgetForMonth(monthKey: string, settings: BudgetSettings) {
    return this.financeModel
      .findOneAndUpdate(
        { type: 'budget', monthKey },
        { ...settings, type: 'budget', monthKey },
        { upsert: true, new: true },
      )
      .exec();
  }

  async copyBudgetToMonth(
    fromKey: CopyBudgetDto['fromKey'],
    toKey: CopyBudgetDto['toKey'],
  ) {
    const from = await this.getBudgetForMonth(fromKey);
    return this.saveBudgetForMonth(toKey, {
      monthlyBudget: from.monthlyBudget,
      alertThreshold: from.alertThreshold ?? 80,
    });
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
      throw new Error('Debt not found');
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
      throw new Error('Debt not found');
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
}
