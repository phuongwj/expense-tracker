import { Request, Response } from "express";
import { NotFoundError } from "../errors/AppError.ts";

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
import { asyncHandler } from "../middleware/asyncHandler.ts";

/** 
 * POST /api/transactions
 * Creates a new personal transaction for the authenticated user.
 */
export const createPersonal = asyncHandler (async (req: Request<{}, {}, CreateTransactionInput>, res: Response) => {
    const userId = req.userId!;
    const { type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval } = req.body;

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
    });

/**
 * GET /api/transactions
 * Returns the authenticated user's personal transactions, optionally filtered.
 */
export const getPersonal = asyncHandler (async (req: Request, res: Response) => {
    const userId = req.userId!;
    const filters = (req as any).validatedQuery as GetTransactionsInput;

    const transactions = await getPersonalTransactions(userId, filters);

    return res.status(200).json({ transactions });
});


/**
 * PUT /api/transactions/:id
 * Updates an existing personal transaction belonging to the authenticated user.
 */
export const updatePersonal = asyncHandler (async (req: Request<{ id: string }, {}, UpdateTransactionInput>, res: Response) => {
    const userId = req.userId!;
    const { id } = req.params;
    const { type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval } = req.body;

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
        throw new NotFoundError('This transaction could not be found. It may have already been deleted, or the ID may be incorrect.');
    }

    return res.status(200).json(transaction);
});

/**
 * DELETE /api/transactions/:id
 * Deletes a personal transaction belonging to the authenticated user.
 */
export const deletePersonal = asyncHandler (async (
    req: Request<{ id: string }, {}, {}>,
    res: Response
) => {
    const userId = req.userId!;
    const { id } = req.params;

    const deleted = await deletePersonalTransaction(id, userId);

    if (!deleted) {
        throw new NotFoundError('This transaction could not be found. It may have already been deleted, or the ID may be incorrect.');
    }

    return res.status(204).send();
});


// **** Group Transactions: 

/**
 * POST /transactions/group/:groupId
 * Creates a new group transaction, optionally with splits.
 */
export const createGroup = asyncHandler (async (
    req: Request<{ groupId: string }, {}, CreateGroupTransactionInput>,
    res: Response
) => {
    const userId = req.userId!;
    const groupId = req.params.groupId;
    const { 
        type, 
        amount, 
        categoryId, 
        transactionDate, 
        description, 
        isRecurring, 
        recurringInterval, 
        paidBy, 
        splits 
    } = req.body;

    const payer = paidBy ?? userId;

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

    return res.status(201).json({
        ...transaction,
        splits: createdSplits
    });
});

/**
 * GET /transactions/group/:groupId
 * Returns transactions for a group, optionally filtered.
 */
export const getGroup = asyncHandler (async (
    req: Request<{ groupId: string }>,
    res: Response
) => {
    const groupId = req.params.groupId;
    const filters = (req as any).validatedQuery;

    const transactions = await getGroupTransactions(groupId, filters);

    return res.status(200).json({ transactions });
});

/**
 * PUT /transactions/group/:groupId/:id
 * Updates an existing group transaction.
 * Important assumption that user performing the action is validated by middleware before this is reached
 */
export const updateGroup = asyncHandler (async (
    req: Request<{ groupId: string; id: string }>,
    res: Response
) => {
    const { id, groupId } = req.params;
    const { type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval } = req.body;

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
        throw new NotFoundError('This group transaction could not be found. It may have already been deleted.');
    }

    return res.status(200).json(transaction);
});

/**
 * DELETE /api/transactions/group/:groupId/:id
 * Deletes a group transaction.
 * Important assumption that user performing the action is validated by middleware before this is reached
 */
export const deleteGroup = asyncHandler (async (
    req: Request<{ groupId: string; id: string }>,
    res: Response
) => {
    const { id, groupId } = req.params;

    const deleted = await deleteGroupTransaction(id, groupId);

    if (!deleted) {
        throw new NotFoundError('This group transaction could not be found. It may have already been deleted.');
    }
    return res.status(204).send();
});