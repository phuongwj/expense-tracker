import pool from "../config/db.ts";
import { Transaction, TransactionSplit, BalanceRow, Settlement } from "./transactionModel.ts";


export const createPersonalTransaction = async (
    userId: string,
    type: 'expense' | 'income',
    amount: number,
    categoryId: string | null,
    transactionDate: string, //ISO date e.g. "2026-07-14"
    description: string | null,
    isRecurring: boolean,
    recurringInterval: string | null
): Promise<Transaction> => {
    const query = `
        INSERT INTO transactions (user_id, amount, type, category_id, transaction_date, description, is_recurring, recurring_interval)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
            id,
            user_id AS "userId",
            group_id AS "groupId",
            paid_by AS "paidBy",
            category_id AS "categoryId",
            type,
            amount,
            transaction_date AS "transactionDate" ,
            description,
            is_recurring AS "isRecurring",
            recurring_interval AS "recurringInterval"
    `;

    const result = await pool.query(query, [userId, amount, type, categoryId, transactionDate, description, isRecurring, recurringInterval]);
    return result.rows[0];
}

//receives a 'filters' object from the controller that contains all the optional query parameters
export const getPersonalTransactions = async (
    userId: string,
    filters: {
        startDate?: string;
        endDate?: string;
        type?: 'expense' | 'income';
        categoryId?: string;
        isRecurring?: boolean;
        recurringInterval?: string;
    }
): Promise<Transaction[]> => {
    let query = `
        SELECT
            id,
            user_id AS "userId",
            group_id AS "groupId",
            paid_by AS "paidBy",
            category_id AS "categoryId",
            type,
            amount,
            transaction_date AS "transactionDate",
            description,
            is_recurring AS "isRecurring",
            recurring_interval AS "recurringInterval"
        FROM transactions
        WHERE user_id = $1
        AND group_id IS NULL
    `;

    //params array will contain the different type values passed in the query params
    const params: any[] = [userId];

    //build up the final query based on which query parameters were sent in the request

    if (filters.startDate) {
         //the string `$${params.length+1}` gives the properly formatted sql placeholder. ex: $1, $2, $3 etc. 
        query += ` AND transaction_date >= $${params.length + 1}`;
        params.push(filters.startDate);
    }
    if (filters.endDate) {
        query += ` AND transaction_date <= $${params.length + 1}`;
        params.push(filters.endDate);
    }
    if (filters.type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(filters.type);
    }
    if (filters.categoryId) {
        query += ` AND category_id = $${params.length + 1}`;
        params.push(filters.categoryId);
    }
    if (filters.isRecurring !== undefined) {
        query += ` AND is_recurring = $${params.length + 1}`;
        params.push(filters.isRecurring);
    }
    if (filters.recurringInterval) {
        query += ` AND recurring_interval = $${params.length + 1}`;
        params.push(filters.recurringInterval);
    }
    if (!filters.startDate && !filters.endDate) {
        query += ` AND transaction_date >= NOW() - INTERVAL '30 days'`;
    }

    query += ` ORDER BY transaction_date DESC`;

    const result = await pool.query(query, params);
    return result.rows;
}

export const updatePersonalTransaction = async (
    transactionId: string,
    userId: string,
    amount: number,
    type: 'expense' | 'income',
    categoryId: string | null,
    transactionDate: string,
    description: string | null,
    isRecurring: boolean,
    recurringInterval: string | null
): Promise<Transaction | null> => {
    const query = `
        UPDATE transactions
        SET amount = $1, type = $2, category_id = $3, transaction_date = $4,
            description = $5, is_recurring = $6, recurring_interval = $7,
            updated_at = now()
        WHERE id = $8 AND user_id = $9 AND group_id IS NULL
        RETURNING
            id,
            user_id AS "userId",
            group_id AS "groupId",
            paid_by AS "paidBy",
            category_id AS "categoryId",
            type,
            amount,
            transaction_date AS "transactionDate",
            description,
            is_recurring AS "isRecurring",
            recurring_interval AS "recurringInterval"
    `;

    const result = await pool.query(query, [amount, type, categoryId, transactionDate, description, isRecurring, recurringInterval, transactionId, userId]);
    return result.rows[0] || null;
}


export const deletePersonalTransaction = async (transactionId: string, userId: string): Promise<boolean> => {
    const query = `
        DELETE FROM transactions
        WHERE id = $1 AND user_id = $2 AND group_id IS NULL
    `;

    const result = await pool.query(query, [transactionId, userId]);
    return (result.rowCount ?? 0) > 0;
}

/**
 * 
 *   Group Transaction Queries
 */

/**
 * Creates a new group transaction. paidBy defaults to the creator (userId)
 * if not provided.
 */
export const createGroupTransaction = async (
    userId: string,
    groupId: number,
    paidBy: string,
    type: 'expense' | 'income',
    amount: number,
    categoryId: string | null,
    transactionDate: string,
    description: string | null,
    isRecurring: boolean,
    recurringInterval: string | null
): Promise<Transaction> => {
    const query = `
        INSERT INTO transactions (user_id, group_id, paid_by, type, amount, category_id, transaction_date, description, is_recurring, recurring_interval)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
            id,
            user_id AS "userId",
            group_id AS "groupId",
            paid_by AS "paidBy",
            category_id AS "categoryId",
            type,
            amount,
            transaction_date AS "transactionDate",
            description,
            is_recurring AS "isRecurring",
            recurring_interval AS "recurringInterval"
    `;

    const result = await pool.query(query, [userId, groupId, paidBy, type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval]);
    return result.rows[0];
}

/**
 * Inserts one row per split for a group transaction.
 * For example, if a group transaction is split between 3 users, there will be 3 rows added to the 
 * transaction_splits table.
 */
export const insertTransactionSplits = async (
    transactionId: string,
    splits: { userId: string; amount: number }[]
): Promise<void> => {
    for (const split of splits) {
        await pool.query(
            `INSERT INTO transaction_splits (transaction_id, user_id, amount) VALUES ($1, $2, $3)`,
            [transactionId, split.userId, split.amount]
        );
    }
}

/**
 * Returns all transactions for a group, filtered by optional query params.
 */
export const getGroupTransactions = async (
    groupId: number,
    filters: {
        startDate?: string;
        endDate?: string;
        type?: 'expense' | 'income';
        categoryId?: string;
        isRecurring?: boolean;
        recurringInterval?: string;
    }
): Promise<Transaction[]> => {
    let query = `
        SELECT
            id,
            user_id AS "userId",
            group_id AS "groupId",
            paid_by AS "paidBy",
            category_id AS "categoryId",
            type,
            amount,
            transaction_date AS "transactionDate",
            description,
            is_recurring AS "isRecurring",
            recurring_interval AS "recurringInterval"
        FROM transactions
        WHERE group_id = $1
    `;

    //build the query based on which query parameters the user included
    const params: unknown[] = [groupId];

    if (filters.startDate) {
        query += ` AND transaction_date >= $${params.length + 1}`;
        params.push(filters.startDate);
    }
    if (filters.endDate) {
        query += ` AND transaction_date <= $${params.length + 1}`;
        params.push(filters.endDate);
    }
    if (filters.type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(filters.type);
    }
    if (filters.categoryId) {
        query += ` AND category_id = $${params.length + 1}`;
        params.push(filters.categoryId);
    }
    if (filters.isRecurring !== undefined) {
        query += ` AND is_recurring = $${params.length + 1}`;
        params.push(filters.isRecurring);
    }
    if (filters.recurringInterval) {
        query += ` AND recurring_interval = $${params.length + 1}`;
        params.push(filters.recurringInterval);
    }
    if (!filters.startDate && !filters.endDate) {
        query += ` AND transaction_date >= NOW() - INTERVAL '30 days'`;
    }

    query += ` ORDER BY transaction_date DESC`;

    const result = await pool.query(query, params);
    return result.rows;
}

//For Group Transaction Update & Delete, I'm assuming that middleware is used to check if the user performing 
// the action is authorized (ex: part of the group, and group leader). 

export const updateGroupTransaction = async (
    transactionId: string,
    groupId: string,
    type: 'expense' | 'income',
    amount: number,
    categoryId: string | null,
    transactionDate: string,
    description: string,
    isRecurring: boolean,
    recurringInterval: string | null
): Promise<Transaction | null> => {
    const query = `
        UPDATE transactions
        SET type = $1, amount = $2, category_id = $3, transaction_date = $4,
            description = $5, is_recurring = $6, recurring_interval = $7,
            updated_at = now()
        WHERE id = $8 AND group_id = $9
        RETURNING
            id,
            user_id AS "userId",
            group_id AS "groupId",
            paid_by AS "paidBy",
            category_id AS "categoryId",
            type,
            amount,
            transaction_date AS "transactionDate",
            description,
            is_recurring AS "isRecurring",
            recurring_interval AS "recurringInterval"
    `;

    const result = await pool.query(query, [type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval, transactionId, groupId]);
    return result.rows[0] || null;
}


export const deleteGroupTransaction = async (transactionId: string, groupId: string): Promise<boolean> => {
    const result = await pool.query(
        `DELETE FROM transactions WHERE id = $1 AND group_id = $2`,
        [transactionId, groupId]
    );
    return (result.rowCount ?? 0) > 0;
}

export const insertSettlement = async (groupId: string, paidBy: string, paidTo: string, amount: number): Promise<Settlement> => {
    const query = `
        INSERT INTO settlements (group_id, paid_by, paid_to, amount)
        VALUES ($1, $2, $3, $4)
        RETURNING
            id,
            group_id AS "groupId",
            paid_by AS "paidBy",
            paid_to AS "paidTo",
            amount,
            settled_at AS "settledAt"
    `;
    const result = await pool.query(query, [groupId, paidBy, paidTo, amount]);
    return result.rows[0];
}
/* Gets all transaction split total amounts (either paid or still owed) between the user and members 
* of a given group. Used in combination with the get settlements query to calculate active balances
*/
export const getGroupSplitsForUser = async (groupId: string, userId: string): Promise<BalanceRow[]> => {
    const query = `
        SELECT ts.user_id AS owes, t.paid_by AS "isOwed", SUM(ts.amount) AS amount
        FROM transaction_splits ts
        JOIN transactions t ON t.id = ts.transaction_id
        WHERE t.group_id = $1
        AND ts.user_id != t.paid_by
        AND (ts.user_id = $2 OR t.paid_by = $2)
        GROUP BY ts.user_id, t.paid_by
    `;
    const result = await pool.query(query, [groupId, userId]);
    return result.rows;
}
/*
* Gets all settlements for a user and members of a given group. Used in combination with the getGroupSplits query
* in order to calculate active balances. 
*/
export const getGroupSettlementsForUser = async (groupId: string, userId: string): Promise<BalanceRow[]> => {
    const query = `
        SELECT paid_by AS owes, paid_to AS "isOwed", SUM(amount) AS amount
        FROM settlements
        WHERE group_id = $1
        AND (paid_by = $2 OR paid_to = $2)
        GROUP BY paid_by, paid_to
    `;
    const result = await pool.query(query, [groupId, userId]);
    return result.rows;
}

/**
 * Same as getGroupSplitsForUser but across every group userId belongs to.
 * Used for the global balance summary.
 */
export const getAllSplitsForUser = async (userId: string): Promise<BalanceRow[]> => {
    const query = `
        SELECT ts.user_id AS owes, t.paid_by AS "isOwed", SUM(ts.amount) AS amount
        FROM transaction_splits ts
        JOIN transactions t ON t.id = ts.transaction_id
        WHERE t.group_id IS NOT NULL
        AND ts.user_id != t.paid_by
        AND (ts.user_id = $1 OR t.paid_by = $1)
        GROUP BY ts.user_id, t.paid_by
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
}

/**
 * Same as getGroupSettlementsForUser but across every group userId belongs to.
 * Used for the global balance summary in combination with getAllSplitsForUser.
 */
export const getAllSettlementsForUser = async (userId: string): Promise<BalanceRow[]> => {
    const query = `
        SELECT paid_by AS owes, paid_to AS "isOwed", SUM(amount) AS amount
        FROM settlements
        WHERE paid_by = $1 OR paid_to = $1
        GROUP BY paid_by, paid_to
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
}

/**
 * Aggregated splits within a group, restricted to two users.
 * Used to validate a settlement's amount in combination with getgroupSettlementsBetweenUsers.
 */
export const getGroupSplitsBetweenUsers = async (groupId: string, userA: string, userB: string): Promise<BalanceRow[]> => {
    const query = `
        SELECT ts.user_id AS owes, t.paid_by AS "isOwed", SUM(ts.amount) AS amount
        FROM transaction_splits ts
        JOIN transactions t ON t.id = ts.transaction_id
        WHERE t.group_id = $1
        AND ts.user_id != t.paid_by
        AND ts.user_id IN ($2, $3) AND t.paid_by IN ($2, $3)
        GROUP BY ts.user_id, t.paid_by
    `;
    const result = await pool.query(query, [groupId, userA, userB]);
    return result.rows;
}

/**
 * Aggregated settlements within a group, restricted to two users.
 * Used to validate a settlement's amount along with getGroupSplitsBetweenUsers
 */
export const getGroupSettlementsBetweenUsers = async (groupId: string, userA: string, userB: string): Promise<BalanceRow[]> => {
    const query = `
        SELECT paid_by AS owes, paid_to AS "isOwed", SUM(amount) AS amount
        FROM settlements
        WHERE group_id = $1
        AND paid_by IN ($2, $3) AND paid_to IN ($2, $3)
        GROUP BY paid_by, paid_to
    `;
    const result = await pool.query(query, [groupId, userA, userB]);
    return result.rows;
}