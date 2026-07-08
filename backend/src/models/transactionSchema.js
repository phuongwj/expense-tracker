import { z } from 'zod';

//for POST requests to create a new transaction
export const createTransactionSchema = z.object({
    type: z.enum(['expense', 'income']),
    amount: z.number().positive(),
    category_id: z.number().int().nullable().optional(),
    transaction_date: z.iso.date(),
    description: z.string().max(255).nullable().optional(),
    is_recurring: z.boolean().optional().default(false),
    recurring_interval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).nullable().optional()
    //superRefine used to conditionally require recurring_interval if is_recurring is true
}).superRefine((data, ctx) => {
    if (data.is_recurring && !data.recurring_interval) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'recurring_interval is required for recurring transactions',
        });
    }
});

//identical to personalTransactionSchema, but includes splits for group transactions
export const createGroupTransactionSchema = z.object({
    type: z.enum(['expense', 'income']),
    amount: z.number().positive(),
    category_id: z.number().int().nullable().optional(),
    transaction_date: z.iso.date(),
    description: z.string().max(255).nullable().optional(),
    is_recurring: z.boolean().optional().default(false),
    recurring_interval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).nullable().optional(),
    splits: z.array(z.object({
        userId: z.number().int(),
        amount: z.number().positive()
    })).optional()
}).superRefine((data, ctx) => {
    if (data.is_recurring && !data.recurring_interval) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'recurring_interval is required for recurring transactions',
        });
    }
});

//for Query Parameters used in GET requests for transactions
export const getTransactionsSchema = z.object({
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    type: z.enum(['expense', 'income']).optional(),
    //z.coerce converts the query param to a number type, validation fails if it isnt convertable
    category_id: z.coerce.number().int().optional(),
    is_recurring: z.enum(['true', 'false']).optional(),
    recurring_interval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).optional()
});

//for PUT requests to update an existing transaction
export const updateTransactionSchema = z.object({
    type: z.enum(['expense', 'income']).optional(),
    amount: z.number().positive().optional(),
    category_id: z.number().int().nullable().optional(),
    transaction_date: z.iso.date().optional(),
    description: z.string().max(255).nullable().optional(),
    is_recurring: z.boolean().optional(),
    recurring_interval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).nullable().optional()
}).superRefine((data, ctx) => {
    if (data.is_recurring && !data.recurring_interval) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'recurring_interval is required for recurring transactions',
        });
    }
});