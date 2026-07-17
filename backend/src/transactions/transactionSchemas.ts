import { z } from "zod";

export const createTransactionSchema = z.object({
    //userID is temporary part of input until JWT issue is resolved
    userId: z.string(),

    type: z.enum(['expense', 'income'], { message: "Transaction type must be either 'expense' or 'income'." }),
    amount: z.number().positive("Transaction amount must be greater than zero."),
    category_id: z.string().nullable().optional(),
    transaction_date: z.iso.date("A valid transaction date is required."),
    description: z.string().trim().max(255, "Transaction's description must be at most 255 characters.").nullable().optional(),
    is_recurring: z.boolean().optional().default(false),
    recurring_interval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'], {
        message: "Transaction's recurring interval must be one of: daily, weekly, biweekly, monthly, yearly."
    }).nullable().optional()
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const getTransactionsSchema = z.object({
    //TEMPORARY:
    userId: z.string(),

    startDate: z.iso.date("A valid start date is required.").optional(),
    endDate: z.iso.date("A valid end date is required.").optional(),
    type: z.enum(['expense', 'income']).optional(),
    category_id: z.string().optional(),
    is_recurring: z.enum(['true', 'false']).optional(),
    recurring_interval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).optional()
});
export type GetTransactionsInput = z.infer<typeof getTransactionsSchema>;

//for now, assuming front end re-sends the entire transaction object w. the updated fields
export const updateTransactionSchema = z.object({
    //TEMPORARY:
    userId: z.string(),

    type: z.enum(['expense', 'income']),
    amount: z.number().positive("Transaction amount must be greater than zero."),
    category_id: z.string().nullable().optional(),
    transaction_date: z.iso.date("A valid transaction date is required."),
    description: z.string().trim().max(255, "Transaction description must be at most 255 characters.").nullable().optional(),
    is_recurring: z.boolean(),
    recurring_interval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).nullable().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const createGroupTransactionSchema = z.object({
    userId: z.string(), // TEMPORARY: workaround until req.userId can be extracted from jwt 
    type: z.enum(['expense', 'income'], { message: "Transaction type must be either 'expense' or 'income'." }),
    amount: z.number().positive("Transaction amount must be greater than zero."),
    category_id: z.string().nullable().optional(),
    transaction_date: z.iso.date("A valid transaction date is required."),
    description: z.string().trim().max(255, "Transaction's description must be at most 255 characters.").nullable().optional(),
    is_recurring: z.boolean().optional().default(false),
    recurring_interval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'], {
        message: "Transaction's recurring interval must be one of: daily, weekly, biweekly, monthly, yearly."
    }).nullable().optional(),
    //paid_by defaults is optional, if not added it will be defaulted to userId 
    paid_by: z.string().optional(),
    splits: z.array(z.object({
        userId: z.string(),
        amount: z.number().positive("Split amount must be greater than zero.")
    })).optional()
});


export type CreateGroupTransactionInput = z.infer<typeof createGroupTransactionSchema>;

export const updateGroupTransactionSchema = z.object({
    type: z.enum(['expense', 'income'], { message: "Transaction type must be either 'expense' or 'income'." }),
    amount: z.number().positive("Transaction amount must be greater than zero."),
    category_id: z.string().nullable().optional(),
    transaction_date: z.iso.date("A valid transaction date is required."),
    description: z.string().trim().max(255, "Transaction's description must be at most 255 characters.").nullable().optional(),
    is_recurring: z.boolean(),
    recurring_interval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'], {
        message: "Transaction's recurring interval must be one of: daily, weekly, biweekly, monthly, yearly."
    }).nullable().optional()
});


export type UpdateGroupTransactionInput = z.infer<typeof updateGroupTransactionSchema>;