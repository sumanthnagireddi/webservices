import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFinanceDto } from './dto/finance/create-finance.dto';
import { UpdateFinanceDto } from './dto/finance/update-finance.dto';
import { CopyBudgetDto } from './dto/budget/copyBudget.dto';
import { CreateDebtDto } from './dto/finance/create-debt.dto';
import { PartialPaymentDto } from './dto/finance/partial-payment.dto';

// finance.controller.ts
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ── Expenses ──
  @Post('/add-expense')
  create(@Body() dto: CreateFinanceDto) {
    return this.financeService.create(dto);
  }

  @Get('/expenses')
  findAllExpensesPerMonth(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('type') type: string,
  ) {
    const y = parseInt(year ?? `${new Date().getFullYear()}`);
    const m = parseInt(month ?? `${new Date().getMonth() + 1}`);
    return this.financeService.findAllExpensesPerMonth(y, m, type);
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

  // ── Debts ──
  @Get('/debts')
  findAllDebts() {
    return this.financeService.findAllDebts();
  }

  @Post('/add-debt')
  createDebt(@Body() dto: CreateDebtDto) {
    return this.financeService.createDebt(dto);
  }

  @Patch('/update-debt/:id')
  updateDebt(@Param('id') id: string, @Body() dto: any) {
    return this.financeService.updateDebt(id, dto);
  }

  @Delete('/delete-debt/:id')
  removeDebt(@Param('id') id: string) {
    return this.financeService.removeDebt(id);
  }

  // ── Budget ──
  @Get('/budget/:monthKey')
  getBudget(@Param('monthKey') monthKey: string,@Query('type') type: string) {
    return this.financeService.getBudgetForMonth(monthKey, type);
  }

  @Put('/budget/:monthKey')
  setBudget(@Param('monthKey') monthKey: string, @Body() body: any) {
    return this.financeService.saveBudgetForMonth(monthKey, body);
  }

  @Post('/budget/copy')
  copyBudget(@Body() dto: CopyBudgetDto) {
    return this.financeService.copyBudgetToMonth(dto.fromKey, dto.toKey);
  }
  // Add to finance.controller.ts

  // GET  /finance/debts               → all active debts
  // GET  /finance/debts/summary       → summary numbers
  // GET  /finance/debts/settled       → settled debts
  // GET  /finance/debts/:id           → single debt
  // GET  /finance/debts?type=i_owe    → filtered by type
  // POST /finance/debts               → create
  // PATCH /finance/debts/:id          → update
  // PATCH /finance/debts/:id/settle   → mark settled
  // PATCH /finance/debts/:id/partial  → record partial payment
  // DELETE /finance/debts/:id         → soft delete

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
  // @Post('/migrate')
  // async migrate() {
  //   return this.financeService.migrateExistingData();
  // }
}
