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
import { PartialPaymentDto } from './dto/finance/partial-payment.dto';
import { UpdateDebtDto } from './dto/finance/update-debt.dto';
import { UpdateFinanceDto } from './dto/finance/update-finance.dto';
import { FinanceService } from './finance.service';
import { isFinanceType } from './schema/finance.schema';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('/add-expense')
  create(@Body() dto: CreateFinanceDto) {
    return this.financeService.create(dto);
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
  addExpenses(@Body() expenses: CreateFinanceDto[]) {
    return this.financeService.addExpenses(expenses);
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
  ) {
    return this.financeService.saveBudgetForMonth(monthKey, body);
  }

  @Post('/budget/copy')
  copyBudget(@Body() dto: CopyBudgetDto) {
    return this.financeService.copyBudgetToMonth(dto.fromKey, dto.toKey);
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
}
