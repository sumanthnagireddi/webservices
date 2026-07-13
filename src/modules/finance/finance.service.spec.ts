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

  it('updates a finance record', async () => {
    const dto = { amount: 60000 };
    financeModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'ce-1', amount: 60000 }),
    });

    const result = await service.update('ce-1', dto);

    expect(financeModel.findByIdAndUpdate).toHaveBeenCalledWith('ce-1', dto, { new: true });
    expect(result.amount).toBe(60000);
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

  describe('Card Registry and Statements', () => {
    it('returns all non-deleted cards', async () => {
      exec.mockResolvedValue([{ name: 'Test Card', lastFour: '1234' }]);
      const cards = await service.getCards();
      expect(financeModel.find).toHaveBeenCalledWith({ type: 'card', isDeleted: false });
      expect(cards).toHaveLength(1);
    });

    it('calculates statements correctly', async () => {
      const mockCard = {
        _id: 'card-1',
        name: 'HDFC Regalia',
        billingDay: 15,
        dueDay: 5,
        creditLimit: 500000,
      };
      const mockExpense = {
        _id: 'pe-1',
        amount: 1000,
        category: 'Food',
        date: '2026-07-10',
        cardId: 'card-1',
        usedBy: 'Self',
        notes: 'test notes',
      };
      
      financeModel.find.mockImplementation((query) => {
        return {
          exec: jest.fn().mockResolvedValue(
            query.type === 'card'
              ? [mockCard]
              : query.type === 'expense'
              ? [mockExpense]
              : []
          ),
        };
      });

      const statements = await service.getCardBillStatements('2026-07');
      expect(statements).toHaveLength(1);
      expect(statements[0].totalAmount).toBe(1000);
      expect(statements[0].isPaid).toBe(false);
      expect(statements[0].transactions).toHaveLength(1);
    });
  });

  describe('Debts and Partial Payments', () => {
    it('creates a debt ledger and maps to frontend format', async () => {
      financeModel.create.mockResolvedValue({
        _id: 'debt-1',
        name: 'Amit',
        amount: 5000,
        debtType: 'owed_to_me',
        dueDate: '2026-07-20',
        status: 'pending',
        notes: 'loan info',
        paidAmount: 0,
        partialPayments: [],
      });

      const result = await service.addDebtLedger({
        contactName: 'Amit',
        amount: 5000,
        type: 'Receivable',
        dueDate: '2026-07-20',
        notes: 'loan info',
      });

      expect(financeModel.create).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'debt-1',
        contactName: 'Amit',
        amount: 5000,
        type: 'Receivable',
        status: 'Pending',
        paidAmount: 0,
      });
    });

    it('adds a partial payment and recalculates status', async () => {
      const mockDebt = {
        _id: 'debt-1',
        amount: 5000,
        status: 'pending',
        partialPayments: [],
        paidAmount: 0,
      };

      financeModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDebt),
      });
      financeModel.findByIdAndUpdate.mockImplementation((id, updates) => {
        return {
          exec: jest.fn().mockResolvedValue({
            ...mockDebt,
            ...updates,
          }),
        };
      });

      const result = await service.addPartialPayment('debt-1', {
        amount: 2000,
        date: '2026-07-15',
        notes: 'first part',
      });

      expect(financeModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'debt-1',
        expect.objectContaining({
          paidAmount: 2000,
          status: 'partial',
        }),
        { new: true }
      );
      expect(result.status).toBe('Partial');
      expect(result.paidAmount).toBe(2000);
      expect(result.partialPayments).toHaveLength(1);
    });
  });
});
