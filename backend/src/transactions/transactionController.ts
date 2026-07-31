import { Request, Response } from "express";
import {
    createPersonalTransaction,
    getPersonalTransactions,
    updatePersonalTransaction,
    deletePersonalTransaction,
    createGroupTransaction,
    getGroupTransactions,
    updateGroupTransaction,
    deleteGroupTransaction,
    insertTransactionSplits,
} from "./transactionRepository.ts";

import { CreateTransactionInput, GetTransactionsInput, UpdateTransactionInput, CreateGroupTransactionInput } from "./transactionSchemas.ts";
import { TransactionSplit } from "./transactionModel.ts";

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

// **** Group Transactions: 

/**
 * POST /transactions/group/:groupId
 * Creates a new group transaction, optionally with splits.
 */
export const createGroup = async (req: Request<{ groupId: string }, {}, CreateGroupTransactionInput>, res: Response) => {
    const userId = req.userId!;
    const groupId = req.params.groupId;
    const { type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval, paidBy, splits } = req.body;

    const payer = paidBy ?? userId;

    try {
        const transaction = await createGroupTransaction(
            userId,
            groupId,
            payer,
            type,
            amount,
            categoryId ?? null,
            transactionDate,
            description ?? null,
            isRecurring,
            isRecurring ? recurringInterval ?? null : null
        );

        let createdSplits: TransactionSplit[] = [];

        if (splits) {
            createdSplits = await insertTransactionSplits(transaction.id, splits);
        }

        return res.status(201).json({...transaction, splits: createdSplits});
    } catch (err) {
        console.error('Create group transaction error:', err);
        return res.status(500).json({ error: 'Something went wrong creating your transaction.' });
    }
};

/**
 * GET /transactions/group/:groupId
 * Returns transactions for a group, optionally filtered.
 */
export const getGroup = async (req: Request<{ groupId: string }>, res: Response) => {
    const groupId = req.params.groupId;
    const filters = (req as any).validatedQuery;

    try {
        const transactions = await getGroupTransactions(groupId, filters);
        return res.status(200).json({ transactions });
    } catch (err) {
        console.error('Get group transactions error:', err);
        return res.status(500).json({ error: 'Something went wrong retrieving transactions.' });
    }
};

/**
 * PUT /transactions/group/:groupId/:id
 * Updates an existing group transaction.
 * Important assumption that user performing the action is validated by middleware before this is reached
 */
export const updateGroup = async (req: Request<{ groupId: string; id: string }>, res: Response) => {
    const { id, groupId } = req.params;
    const { type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval } = req.body;

    try {
        const transaction = await updateGroupTransaction(
            id,
            groupId,
            type,
            amount,
            categoryId ?? null,
            transactionDate,
            description,
            isRecurring,
            isRecurring ? recurringInterval ?? null : null
        );

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        return res.status(200).json(transaction);
    } catch (err) {
        console.error('Update group transaction error:', err);
        return res.status(500).json({ error: 'Something went wrong updating your transaction.' });
    }
};

/**
 * DELETE /api/transactions/group/:groupId/:id
 * Deletes a group transaction.
 * Important assumption that user performing the action is validated by middleware before this is reached
 */
export const deleteGroup = async (req: Request<{ groupId: string; id: string }>, res: Response) => {
    const { id, groupId } = req.params;

    try {
        const deleted = await deleteGroupTransaction(id, groupId);

        if (!deleted) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        return res.status(204).send();
    } catch (err) {
        console.error('Delete group transaction error:', err);
        return res.status(500).json({ error: 'Something went wrong deleting your transaction.' });
    }
};