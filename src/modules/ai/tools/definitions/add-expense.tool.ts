export const ADD_EXPENSE_TOOL = {
  type: 'function',                        // ✅ required by NVIDIA/OpenAI API
  function: {
    name: 'add_expense',
    description: `Save an expense to the finance tracker.
                  Call this whenever the user mentions spending, paying, or buying something.
                  Extract all details you can from the message.`,
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'The amount spent in Indian Rupees. Always a positive number.',
        },
        merchant: {
          type: 'string',
          description: 'Where the money was spent. e.g. Swiggy, Dominos, Uber, DMart',
        },
        category: {
          type: 'string',
          enum: ['Food', 'Transport', 'Groceries', 'Fuel', 'Shopping', 'Bills', 'Other'],
          description: 'Best matching category for this expense',
        },
        date: {
          type: 'string',
          description: 'ISO date string. Use today if not mentioned. e.g. 2026-03-14',
        },
        notes: {
          type: 'string',
          description: 'Any extra detail from the user message. Optional.',
        },
        is_refund: {
          type: 'boolean',
          description: 'Set true if user mentions a refund or money received back. Default false.',
        },
      },
      required: ['amount', 'merchant', 'category', 'date'],
    },
  },
};