import { z } from "zod";

export {
    createTransactionSchema,
    getTransactionsSchema,
    updateTransactionSchema,
    createGroupTransactionSchema,
    updateGroupTransactionSchema,
    createSettlementSchema,
    CreateTransactionInput,
    GetTransactionsInput,
    UpdateTransactionInput,
    CreateGroupTransactionInput,
    UpdateGroupTransactionInput,
    CreateSettlementInput
} from "@expense-tracker/shared/transactions";

export const deleteTransactionSchema = z.object({
    id: z.string().uuid("A valid transaction id is required."),
});

export type TransactionIdParam = z.infer<typeof deleteTransactionSchema>;



