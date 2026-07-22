import { Request, Response } from "express";
import {
    createPersonalTransaction,
    getPersonalTransactions,
    updatePersonalTransaction,
    deletePersonalTransaction,
} from "./transactionRepository.ts";
import { CreateTransactionInput, GetTransactionsInput, UpdateTransactionInput } from "./transactionSchemas.ts";

/**
 * POST /api/transactions
 * Creates a new personal transaction for the authenticated user.
 */
export const createPersonal = async (req: Request<{}, {}, CreateTransactionInput>, res: Response) => {
    const userId = req.userId!;
    const { type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval } = req.body;

    try {
        const transaction = await createPersonalTransaction(
            userId,
            type,
            amount,
            categoryId ?? null,
            transactionDate,
            description ?? null,
            isRecurring,
            isRecurring ? recurringInterval ?? null : null
        );

        return res.status(201).json(transaction);
    } catch (err) {
        console.error('Create personal transaction error:', err);
        return res.status(500).json({ error: 'Something went wrong creating your transaction.' });
    }
};

/**
 * GET /api/transactions
 * Returns the authenticated user's personal transactions, optionally filtered.
 */
export const getPersonal = async (req: Request, res: Response) => {
    const userId = req.userId!;
    const filters = (req as any).validatedQuery as GetTransactionsInput;

    try {
        const transactions = await getPersonalTransactions(userId, filters);
        return res.status(200).json({ transactions });
    } catch (err) {
        console.error('Get personal transactions error:', err);
        return res.status(500).json({ error: 'Something went wrong retrieving your transactions.' });
    }
};

/**
 * PUT /api/transactions/:id
 * Updates an existing personal transaction belonging to the authenticated user.
 */
export const updatePersonal = async (req: Request<{ id: string }, {}, UpdateTransactionInput>, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval } = req.body;

    try {
        const transaction = await updatePersonalTransaction(
            id,
            userId,
            amount,
            type,
            categoryId ?? null,
            transactionDate,
            description ?? null,
            isRecurring,
            isRecurring ? recurringInterval ?? null : null
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        return res.status(200).json(transaction);
    } catch (err) {
        console.error('Update personal transaction error:', err);
        return res.status(500).json({ error: 'Something went wrong updating your transaction.' });
    }
};

/**
 * DELETE /api/transactions/:id
 * Deletes a personal transaction belonging to the authenticated user.
 */
export const deletePersonal = async (req: Request<{ id: string }, {}, {}>, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;

    try {
        const deleted = await deletePersonalTransaction(id, userId);

        if (!deleted) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        return res.status(204).send();
    } catch (err) {
        console.error('Delete personal transaction error:', err);
        return res.status(500).json({ error: 'Something went wrong deleting your transaction.' });
    }
};
