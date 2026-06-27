import { Test, TestingModule } from '@nestjs/testing';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

describe('FinanceController', () => {
  let controller: FinanceController;

  const financeService = {
    addExpenses: jest.fn(),
    copyBudgetToMonth: jest.fn(),
    create: jest.fn(),
    findAllExpenses: jest.fn(),
    findAllExpensesPerMonth: jest.fn(),
    getBudgetForMonth: jest.fn(),
    getDashboard: jest.fn(),
    saveBudgetForMonth: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [
        {
          provide: FinanceService,
          useValue: financeService,
        },
      ],
    }).compile();

    controller = module.get<FinanceController>(FinanceController);
  });

  it('passes the query type through when creating an expense', () => {
    const dto = {
      title: 'Groceries',
      amount: 2400,
      category: 'groceries',
      date: '2026-05-01',
    };

    controller.create(dto, 'construction');

    expect(financeService.create).toHaveBeenCalledWith(dto, 'construction');
  });

  it('preserves the legacy get-expenses route contract', () => {
    controller.findAllExpenses('construction');

    expect(financeService.findAllExpenses).toHaveBeenCalledWith(
      'construction',
    );
  });

  it('resolves month defaults when listing expenses', () => {
    controller.findAllExpensesPerMonth(undefined as never, undefined as never);

    expect(financeService.findAllExpensesPerMonth).toHaveBeenCalledWith(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      undefined,
    );
  });

  it('routes dashboard queries to the dashboard service', () => {
    controller.getDashboard('2026', '5', 'construction');

    expect(financeService.getDashboard).toHaveBeenCalledWith(
      2026,
      5,
      'construction',
    );
  });

  it('preserves budget type overrides when saving a budget', () => {
    const budget = { monthlyBudget: 50000, alertThreshold: 75 };

    controller.setBudget('2026-05', budget, 'home_budget');

    expect(financeService.saveBudgetForMonth).toHaveBeenCalledWith(
      '2026-05',
      budget,
      'home_budget',
    );
  });

  it('preserves budget type overrides when copying a budget', () => {
    controller.copyBudget(
      { fromKey: '2026-04', toKey: '2026-05' },
      'home_budget',
    );

    expect(financeService.copyBudgetToMonth).toHaveBeenCalledWith(
      '2026-04',
      '2026-05',
      'home_budget',
    );
  });

  it('passes the requested payload type for bulk imports', () => {
    const expenses = [
      {
        title: 'Steel',
        amount: 12500,
        category: 'other',
        date: '2026-05-03',
      },
    ];

    controller.addExpenses(expenses, 'construction');

    expect(financeService.addExpenses).toHaveBeenCalledWith(
      expenses,
      'construction',
    );
  });
});
