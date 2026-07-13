import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CopyBudgetDto } from './dto/budget/copyBudget.dto';
import { CreateDebtDto } from './dto/finance/create-debt.dto';
import { CreateFinanceDto } from './dto/finance/create-finance.dto';
import { CreateCardDto } from './dto/finance/create-card.dto';
import { PartialPaymentDto } from './dto/finance/partial-payment.dto';
import { UpdateDebtDto } from './dto/finance/update-debt.dto';
import { UpdateFinanceDto } from './dto/finance/update-finance.dto';
import { UpdateCardDto } from './dto/finance/update-card.dto';
import { FinanceService } from './finance.service';
import { isFinanceType } from './schema/finance.schema';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('/add-expense')
  create(@Body() dto: CreateFinanceDto, @Query('type') type?: string) {
    return this.financeService.create(
      dto,
      isFinanceType(type) ? type : undefined,
    );
  }

  @Get('/get-expenses')
  findAllExpenses(@Query('type') type?: string) {
    return this.financeService.findAllExpenses(
      isFinanceType(type) ? type : undefined,
    );
  }

  @Get('/expenses')
  findAllExpensesPerMonth(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('type') type?: string,
  ) {
    const resolvedYear = Number.parseInt(
      year ?? `${new Date().getFullYear()}`,
      10,
    );
    const resolvedMonth = Number.parseInt(
      month ?? `${new Date().getMonth() + 1}`,
      10,
    );
    const resolvedType = isFinanceType(type) ? type : undefined;

    return this.financeService.findAllExpensesPerMonth(
      resolvedYear,
      resolvedMonth,
      resolvedType,
    );
  }

  @Get('/dashboard')
  getDashboard(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('type') type?: string,
  ) {
    const resolvedYear = Number.parseInt(
      year ?? `${new Date().getFullYear()}`,
      10,
    );
    const resolvedMonth = Number.parseInt(
      month ?? `${new Date().getMonth() + 1}`,
      10,
    );
    const resolvedType = isFinanceType(type) ? type : undefined;

    return this.financeService.getDashboard(
      resolvedYear,
      resolvedMonth,
      resolvedType,
    );
  }

  @Get('/expense/:id')
  findOne(@Param('id') id: string) {
    return this.financeService.findOne(id);
  }

  @Patch('/update-expense/:id')
  update(@Param('id') id: string, @Body() dto: UpdateFinanceDto) {
    return this.financeService.update(id, dto);
  }

  @Delete('/delete-expense/:id')
  remove(@Param('id') id: string) {
    return this.financeService.remove(id);
  }

  @Post('/add-expenses')
  addExpenses(@Body() expenses: CreateFinanceDto[], @Query('type') type?: string) {
    return this.financeService.addExpenses(
      expenses,
      isFinanceType(type) ? type : undefined,
    );
  }

  @Get('/debts')
  findAllDebts() {
    return this.financeService.findAllDebts();
  }

  @Post('/add-debt')
  createDebt(@Body() dto: CreateDebtDto) {
    return this.financeService.createDebt(dto);
  }

  @Patch('/update-debt/:id')
  updateDebt(@Param('id') id: string, @Body() dto: UpdateDebtDto) {
    return this.financeService.updateDebt(id, dto);
  }

  @Delete('/delete-debt/:id')
  removeDebt(@Param('id') id: string) {
    return this.financeService.removeDebt(id);
  }

  @Get('/budget/:monthKey')
  getBudget(@Param('monthKey') monthKey: string, @Query('type') type?: string) {
    return this.financeService.getBudgetForMonth(
      monthKey,
      isFinanceType(type) ? type : undefined,
    );
  }

  @Put('/budget/:monthKey')
  setBudget(
    @Param('monthKey') monthKey: string,
    @Body() body: { monthlyBudget: number; alertThreshold: number },
    @Query('type') type?: string,
  ) {
    return this.financeService.saveBudgetForMonth(
      monthKey,
      body,
      isFinanceType(type) ? type : undefined,
    );
  }

  @Post('/budget/copy')
  copyBudget(@Body() dto: CopyBudgetDto, @Query('type') type?: string) {
    return this.financeService.copyBudgetToMonth(
      dto.fromKey,
      dto.toKey,
      isFinanceType(type) ? type : undefined,
    );
  }

  @Get('/debts/summary')
  getDebtSummary() {
    return this.financeService.getDebtSummary();
  }

  @Get('/debts/settled')
  findSettledDebts() {
    return this.financeService.findSettledDebts();
  }

  @Get('/debts/:id')
  findOneDebt(@Param('id') id: string) {
    return this.financeService.findOneDebt(id);
  }

  @Patch('/debts/:id/settle')
  markDebtSettled(@Param('id') id: string) {
    return this.financeService.markDebtSettled(id);
  }

  @Patch('/debts/:id/partial')
  recordPartialPayment(
    @Param('id') id: string,
    @Body() dto: PartialPaymentDto,
  ) {
    return this.financeService.recordPartialPayment(id, dto);
  }

  // --- New Routes for Next-App Dashboard Integration ---

  @Get('/cards')
  getCards() {
    return this.financeService.getCards();
  }

  @Post('/cards')
  addCard(@Body() dto: CreateCardDto) {
    return this.financeService.addCard(dto);
  }

  @Delete('/cards/:id')
  deleteCard(@Param('id') id: string) {
    return this.financeService.deleteCard(id);
  }

  @Patch('/cards/:id')
  updateCard(
    @Param('id') id: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.financeService.updateCard(id, dto);
  }

  @Get('/personal-expenses')
  async getPersonalExpenses() {
    const data = await this.financeService.getPersonalExpenses();
    console.log('LOGGING EXPENSES INFO FOR DEBUGGING:');
    console.log('Total expenses found:', data.length);
    if (data.length > 0) {
      console.log('Sample item:', JSON.stringify(data[0]));
      console.log('All expense dates and types:', data.map(d => ({ type: d.type, date: d.date, amount: d.amount })));
    }
    return data;
  }

  @Post('/personal-expenses')
  addPersonalExpense(@Body() dto: CreateFinanceDto) {
    return this.financeService.addPersonalExpense(dto);
  }

  @Delete('/personal-expenses/:id')
  deletePersonalExpense(@Param('id') id: string) {
    return this.financeService.deletePersonalExpense(id);
  }

  @Patch('/personal-expenses/:id')
  updatePersonalExpense(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceDto,
  ) {
    return this.financeService.update(id, dto);
  }

  @Get('/personal-target')
  getPersonalTarget() {
    return this.financeService.getPersonalTarget();
  }

  @Put('/personal-target')
  updatePersonalTarget(@Body() body: { target: number }) {
    return this.financeService.updatePersonalTarget(body.target);
  }

  @Get('/construction-expenses')
  getConstructionExpenses() {
    return this.financeService.getConstructionExpenses();
  }

  @Post('/construction-expenses')
  addConstructionExpense(@Body() dto: CreateFinanceDto) {
    return this.financeService.addConstructionExpense(dto);
  }

  @Patch('/construction-expenses/:id/status')
  updateConstructionExpenseStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.financeService.updateConstructionExpenseStatus(id, body.status);
  }

  @Delete('/construction-expenses/:id')
  deleteConstructionExpense(@Param('id') id: string) {
    return this.financeService.deleteConstructionExpense(id);
  }

  @Patch('/construction-expenses/:id')
  updateConstructionExpense(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceDto,
  ) {
    return this.financeService.update(id, dto);
  }

  @Get('/construction-budget')
  getConstructionBudget() {
    return this.financeService.getConstructionBudget();
  }

  @Put('/construction-budget')
  updateConstructionBudget(@Body() body: { budget: number }) {
    return this.financeService.updateConstructionBudget(body.budget);
  }

  @Get('/debts-ledger')
  getDebtsLedger() {
    return this.financeService.getDebtsLedger();
  }

  @Post('/debts-ledger')
  addDebtLedger(@Body() body: any) {
    return this.financeService.addDebtLedger(body);
  }

  @Patch('/debts-ledger/:id/status')
  updateDebtLedgerStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.financeService.updateDebtLedgerStatus(id, body.status);
  }

  @Delete('/debts-ledger/:id')
  deleteDebtLedger(@Param('id') id: string) {
    return this.financeService.deleteDebtLedger(id);
  }

  @Patch('/debts-ledger/:id')
  editDebtLedger(@Param('id') id: string, @Body() body: any) {
    return this.financeService.editDebtLedger(id, body);
  }

  @Post('/debts-ledger/:id/partial-payments')
  addPartialPayment(
    @Param('id') id: string,
    @Body() body: { amount: number; date: string; notes?: string },
  ) {
    return this.financeService.addPartialPayment(id, body);
  }

  @Patch('/debts-ledger/:id/partial-payments/:partialId')
  editPartialPayment(
    @Param('id') id: string,
    @Param('partialId') partialId: string,
    @Body() body: { amount?: number; date?: string; notes?: string },
  ) {
    return this.financeService.editPartialPayment(id, partialId, body);
  }

  @Delete('/debts-ledger/:id/partial-payments/:partialId')
  deletePartialPayment(
    @Param('id') id: string,
    @Param('partialId') partialId: string,
  ) {
    return this.financeService.deletePartialPayment(id, partialId);
  }

  @Get('/card-bills/:month')
  getCardBillStatements(@Param('month') month: string) {
    return this.financeService.getCardBillStatements(month);
  }

  @Post('/card-bills/:cardId/:month/pay')
  markCardBillAsPaid(
    @Param('cardId') cardId: string,
    @Param('month') month: string,
    @Body() body: { isPaid: boolean },
  ) {
    return this.financeService.markCardBillAsPaid(cardId, month, body.isPaid);
  }
}
