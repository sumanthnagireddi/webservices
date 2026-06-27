import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  const exec = jest.fn();
  const sort = jest.fn(() => ({ exec }));

  const financeModel = {
    create: jest.fn(),
    find: jest.fn(() => ({ sort, exec })),
    findById: jest.fn(() => ({ exec })),
    findByIdAndUpdate: jest.fn(() => ({ exec })),
    findOne: jest.fn(() => ({ exec })),
    findOneAndUpdate: jest.fn(() => ({ exec })),
    insertMany: jest.fn(),
  };

  let service: FinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    exec.mockReset();
    sort.mockClear();
    service = new FinanceService(financeModel as never);
  });

  it('resolves bulk import types from the requested finance mode', async () => {
    financeModel.insertMany.mockResolvedValue([]);

    await service.addExpenses(
      [
        {
          title: 'Cement',
          amount: 4200,
          category: 'other',
          date: '2026-05-01',
        },
      ],
      'construction',
    );

    expect(financeModel.insertMany).toHaveBeenCalledWith([
      {
        title: 'Cement',
        amount: 4200,
        category: 'other',
        date: '2026-05-01',
        type: 'construction',
      },
    ]);
  });

  it('returns all non-deleted expenses for the requested finance mode', async () => {
    exec.mockResolvedValue([]);

    await service.findAllExpenses('construction');

    expect(financeModel.find).toHaveBeenCalledWith({
      type: 'construction',
      isDeleted: false,
    });
    expect(sort).toHaveBeenCalledWith({ date: -1 });
  });

  it('resolves home budgets to the shared build budget key', async () => {
    exec.mockResolvedValue(null);

    const budget = await service.getBudgetForMonth('2026-05', 'home_budget');

    expect(financeModel.findOne).toHaveBeenCalledWith({
      type: 'home_budget',
      monthKey: 'construction-overall',
      isDeleted: false,
    });
    expect(budget).toEqual({ monthlyBudget: 0, alertThreshold: 80 });
  });

  it('returns all construction expenses when requesting a monthly build view', async () => {
    const findAllExpensesSpy = jest
      .spyOn(service, 'findAllExpenses')
      .mockResolvedValue([] as never);

    await service.findAllExpensesPerMonth(2026, 5, 'construction');

    expect(findAllExpensesSpy).toHaveBeenCalledWith('construction');
  });

  it('copies budgets within the same budget type', async () => {
    const getBudgetSpy = jest
      .spyOn(service, 'getBudgetForMonth')
      .mockResolvedValue({ monthlyBudget: 75000, alertThreshold: 70 });
    const saveBudgetSpy = jest
      .spyOn(service, 'saveBudgetForMonth')
      .mockResolvedValue({} as never);

    await service.copyBudgetToMonth('2026-04', '2026-05', 'home_budget');

    expect(getBudgetSpy).toHaveBeenCalledWith('2026-04', 'home_budget');
    expect(saveBudgetSpy).toHaveBeenCalledWith(
      '2026-05',
      { monthlyBudget: 75000, alertThreshold: 70 },
      'home_budget',
    );
  });

  it('builds a consolidated dashboard summary for the finance screen', async () => {
    jest.spyOn(service, 'findAllExpensesPerMonth').mockResolvedValue([
      {
        title: 'Groceries',
        amount: 3200,
        category: 'groceries',
      },
      {
        title: 'Rent',
        amount: 18000,
        category: 'rent',
      },
    ] as never);
    jest.spyOn(service, 'getBudgetForMonth').mockResolvedValue({
      monthlyBudget: 30000,
      alertThreshold: 80,
    });

    const dashboard = await service.getDashboard(2026, 5, 'expense');

    expect(dashboard).toMatchObject({
      monthKey: '2026-05',
      expenseType: 'expense',
      budgetType: 'budget',
      budget: {
        monthlyBudget: 30000,
        alertThreshold: 80,
      },
      summary: {
        totalSpent: 21200,
        budget: 30000,
        remaining: 8800,
        percentUsed: 71,
        totalTransactions: 2,
      },
    });
    expect(dashboard.summary.categoryBreakdown).toEqual([
      { category: 'rent', total: 18000 },
      { category: 'groceries', total: 3200 },
    ]);
  });

  it('builds the construction dashboard from all build resources and the shared budget', async () => {
    const findAllExpensesSpy = jest.spyOn(service, 'findAllExpenses').mockResolvedValue([
      {
        title: 'Cement delivery',
        amount: 18500,
        category: 'other',
      },
      {
        title: 'Steel rods',
        amount: 32000,
        category: 'other',
      },
    ] as never);
    const findAllExpensesPerMonthSpy = jest.spyOn(service, 'findAllExpensesPerMonth');
    const getBudgetSpy = jest.spyOn(service, 'getBudgetForMonth').mockResolvedValue({
      monthlyBudget: 120000,
      alertThreshold: 85,
    });

    const dashboard = await service.getDashboard(2026, 5, 'construction');

    expect(findAllExpensesSpy).toHaveBeenCalledWith('construction');
    expect(findAllExpensesPerMonthSpy).not.toHaveBeenCalled();
    expect(getBudgetSpy).toHaveBeenCalledWith(
      'construction-overall',
      'home_budget',
    );
    expect(dashboard).toMatchObject({
      monthKey: 'construction-overall',
      expenseType: 'construction',
      budgetType: 'home_budget',
      budget: {
        monthlyBudget: 120000,
        alertThreshold: 85,
      },
      summary: {
        totalSpent: 50500,
        budget: 120000,
        remaining: 69500,
        percentUsed: 42,
        totalTransactions: 2,
      },
    });
  });
});
