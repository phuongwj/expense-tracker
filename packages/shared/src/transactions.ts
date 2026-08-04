import { z } from "zod";

export const createTransactionSchema = z.object({
    type: z.enum(['expense', 'income'], { message: "Transaction type must be either 'expense' or 'income'." }),
    amount: z.number().positive("Transaction amount must be greater than zero."),
    categoryId: z.string().uuid().nullable().optional(),
    transactionDate: z.iso.date("A valid transaction date is required."),
    description: z.string().trim().max(255, "Transaction's description must be at most 255 characters.").nullable().optional(),
    isRecurring: z.boolean().optional().default(false),
    recurringInterval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'], {
        message: "Transaction's recurring interval must be one of: daily, weekly, biweekly, monthly, yearly."
    }).nullable().optional()
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const getTransactionsSchema = z.object({
    startDate: z.iso.date("A valid start date is required.").optional(),
    endDate: z.iso.date("A valid end date is required.").optional(),
    type: z.enum(['expense', 'income']).optional(),
    categoryId: z.string().uuid().optional(),
    isRecurring: z.stringbool().optional(),
    recurringInterval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).optional()
});
export type GetTransactionsInput = z.infer<typeof getTransactionsSchema>;

//re-send the entire transaction object w. the updated fields
export const updateTransactionSchema = z.object({
    type: z.enum(['expense', 'income']),
    amount: z.number().positive("Transaction amount must be greater than zero."),
    categoryId: z.string().uuid().nullable().optional(),
    transactionDate: z.iso.date("A valid transaction date is required."),
    description: z.string().trim().max(255, "Transaction description must be at most 255 characters.").nullable().optional(),
    isRecurring: z.boolean(),
    recurringInterval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).nullable().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;


export const createGroupTransactionSchema = z.object({
    type: z.enum(['expense', 'income'], { message: "Transaction type must be either 'expense' or 'income'." }),
    amount: z.number().positive("Transaction amount must be greater than zero."),
    categoryId: z.string().nullable().optional(),
    transactionDate: z.iso.date("A valid transaction date is required."),
    description: z.string().trim().max(255, "Transaction's description must be at most 255 characters.").nullable().optional(),
    isRecurring: z.boolean().optional().default(false),
    recurringInterval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'], {
        message: "Transaction's recurring interval must be one of: daily, weekly, biweekly, monthly, yearly."
    }).nullable().optional(),
    //paidBy is optional, if not added it will be defaulted to userId 
    paidBy: z.string().optional(),
    splits: z.array(z.object({
        userId: z.string(),
        amount: z.number().positive("Split amount must be greater than zero.")
    })).optional()
}).refine(
    (data) => {
        if (!data.splits || data.splits.length === 0) return true;
        const splitTotal = data.splits.reduce((sum, s) => sum + s.amount, 0);
        return Math.abs(splitTotal - data.amount) < 0.01;
    },
    {
        message: "Split amounts must add up to the transaction's total amount.",
        path: ["splits"],
    }
);


export type CreateGroupTransactionInput = z.infer<typeof createGroupTransactionSchema>;

export const updateGroupTransactionSchema = z.object({
    type: z.enum(['expense', 'income'], { message: "Transaction type must be either 'expense' or 'income'." }),
    amount: z.number().positive("Transaction amount must be greater than zero."),
    categoryId: z.string().nullable().optional(),
    transactionDate: z.iso.date("A valid transaction date is required."),
    description: z.string().trim().max(255, "Transaction's description must be at most 255 characters.").nullable().optional(),
    isRecurring: z.boolean(),
    recurringInterval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly'], {
        message: "Transaction's recurring interval must be one of: daily, weekly, biweekly, monthly, yearly."
    }).nullable().optional()
});


export type UpdateGroupTransactionInput = z.infer<typeof updateGroupTransactionSchema>;

export const createSettlementSchema = z.object({
    repayingUserId: z.string(),
    amount: z.number().positive("Settlement amount must be greater than zero.")
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
