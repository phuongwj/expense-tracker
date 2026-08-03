import pool from "../config/db.ts";
import { Transaction, TransactionSplit, BalanceRow, Settlement, DueRecurringTemplate } from "./transactionModel.ts";


/**
 * Helper function used to calculate the next occurence of a recurring transaction.
 * Given a transaction's date and its recurring interval, returns the date that
 * the next occurrence is due, as an ISO date string ("YYYY-MM-DD");
 */
const calculateNextOccurrence = (fromDate: string, interval: string): string => {
    const date = new Date(`${fromDate}T00:00:00Z`);

    switch (interval) {
        case 'daily':
            date.setUTCDate(date.getUTCDate() + 1);
            break;
        case 'weekly':
            date.setUTCDate(date.getUTCDate() + 7);
            break;
        case 'biweekly':
            date.setUTCDate(date.getUTCDate() + 14);
            break;
        case 'monthly':
            date.setUTCMonth(date.getUTCMonth() + 1);
            break;
        case 'yearly':
            date.setUTCFullYear(date.getUTCFullYear() + 1);
            break;
    }

    return date.toISOString().split('T')[0];
};

//helpeer function to get today's date in ISO format (YYYY-MM-DD)
const todayISODate = (): string => new Date().toISOString().split('T')[0];

export const createPersonalTransaction = async (
    userId: string,
    type: 'expense' | 'income',
    amount: number,
    categoryId: string | null,
    transactionDate: string,
    description: string | null,
    isRecurring: boolean,
    recurringInterval: string | null
): Promise<Transaction> => {
    const nextOccurrence = isRecurring && recurringInterval
        ? calculateNextOccurrence(transactionDate, recurringInterval)
        : null;

    const query = `
        INSERT INTO transactions (
            user_id, amount, type, category_id, transaction_date, description,
            is_recurring, recurring_interval, next_occurrence
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

    const result = await pool.query(query, [userId, amount, type, categoryId, transactionDate, description, isRecurring, recurringInterval, nextOccurrence]);
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
            t.id,
            t.user_id AS "userId",
            t.group_id AS "groupId",
            t.paid_by AS "paidBy",
            t.category_id AS "categoryId",
            c.name AS "category",
            t.type,
            t.amount,
            t.transaction_date AS "transactionDate",
            t.description,
            t.is_recurring AS "isRecurring",
            t.recurring_interval AS "recurringInterval"
        FROM transactions t
        LEFT JOIN categories c
        ON t.category_id = c.id
        WHERE t.user_id = $1
        AND t.group_id IS NULL
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

    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;

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
    const nextOccurrence = isRecurring && recurringInterval
        ? calculateNextOccurrence(transactionDate, recurringInterval)
        : null;

    const query = `
        UPDATE transactions
        SET amount = $1, type = $2, category_id = $3, transaction_date = $4,
            description = $5, is_recurring = $6, recurring_interval = $7,
            next_occurrence = $8, updated_at = now()
        WHERE id = $9 AND user_id = $10 AND group_id IS NULL
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

    const result = await pool.query(query, [amount, type, categoryId, transactionDate, description, isRecurring, recurringInterval, nextOccurrence, transactionId, userId]);
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
    groupId: string,
    paidBy: string,
    type: 'expense' | 'income',
    amount: number,
    categoryId: string | null,
    transactionDate: string,
    description: string | null,
    isRecurring: boolean,
    recurringInterval: string | null
): Promise<Transaction> => {
    const nextOccurrence = isRecurring && recurringInterval
        ? calculateNextOccurrence(transactionDate, recurringInterval)
        : null;

    const query = `
        INSERT INTO transactions (
            user_id, group_id, paid_by, type, amount, category_id, transaction_date, description,
            is_recurring, recurring_interval, next_occurrence
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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

    const result = await pool.query(query, [userId, groupId, paidBy, type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval, nextOccurrence]);
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
): Promise<TransactionSplit[]> => {
    const splitsAdded: TransactionSplit[] = [];

    for (const split of splits) {
        const result = await pool.query(
            `INSERT INTO transaction_splits (transaction_id, user_id, amount) VALUES ($1, $2, $3)
            RETURNING 
                id,
                transaction_id AS "transactionId",
                user_id AS "userId",
                amount
            `,
            [transactionId, split.userId, split.amount]
        );
        splitsAdded.push(result.rows[0]);
    }
    return splitsAdded;
}

/**
 * Returns all transactions for a group, filtered by optional query params.
 */
export const getGroupTransactions = async (
    groupId: string,
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
            t.id,
            t.user_id AS "userId",
            t.group_id AS "groupId",
            t.paid_by AS "paidBy",
            t.category_id AS "categoryId",
            c.name AS "category",
            t.type,
            t.amount,
            t.transaction_date AS "transactionDate",
            t.description,
            t.is_recurring AS "isRecurring",
            t.recurring_interval AS "recurringInterval"
        FROM transactions t
        LEFT JOIN categories c
        ON t.category_id = c.id
        WHERE t.group_id = $1
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

    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
}

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
    const nextOccurrence = isRecurring && recurringInterval
        ? calculateNextOccurrence(transactionDate, recurringInterval)
        : null;
    //captures the pre-update amount (via the `old` CTE, which sees the same snapshot as the rest of this
    //statement) so the splits can be rescaled by the same ratio the total changed by. Keeps whatever shape
    //the splits had - equal or custom - without needing the caller to resubmit a new split breakdown.
    const query = `
        WITH old AS (
            SELECT amount FROM transactions WHERE id = $9 AND group_id = $10
        ),
        updated AS (
            UPDATE transactions
            SET type = $1, amount = $2, category_id = $3, transaction_date = $4,
                description = $5, is_recurring = $6, recurring_interval = $7,
                next_occurrence = $8, updated_at = now()
            WHERE id = $9 AND group_id = $10
            RETURNING
                id, user_id, group_id, paid_by, category_id, type, amount,
                transaction_date, description, is_recurring, recurring_interval
        ),
        scaled_splits AS (
            UPDATE transaction_splits
            SET amount = ROUND(transaction_splits.amount * ($2::numeric / old.amount), 2)
            FROM old
            WHERE transaction_splits.transaction_id = $9
        )
        SELECT
            updated.id,
            updated.user_id AS "userId",
            updated.group_id AS "groupId",
            updated.paid_by AS "paidBy",
            updated.category_id AS "categoryId",
            updated.type,
            updated.amount,
            updated.transaction_date AS "transactionDate",
            updated.description,
            updated.is_recurring AS "isRecurring",
            updated.recurring_interval AS "recurringInterval"
        FROM updated
    `;

    const result = await pool.query(query, [type, amount, categoryId, transactionDate, description, isRecurring, recurringInterval, nextOccurrence, transactionId, groupId]);
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

/**
 * Used to find which recurring transactions belonging to the user/owner are due to be automatically created.
 */
export const findDueRecurringTransactions = async (ownerId: string): Promise<DueRecurringTemplate[]> => {
    
    const query = `
        SELECT
            id,
            user_id AS "userId",
            group_id AS "groupId",
            paid_by AS "paidBy",
            category_id AS "categoryId",
            type,
            amount,
            description,
            recurring_interval AS "recurringInterval",
            next_occurrence AS "nextOccurrence"
        FROM transactions
        WHERE is_recurring = true
        AND next_occurrence <= CURRENT_DATE
        AND (
            (group_id IS NULL AND user_id = $1)
            OR (group_id IS NOT NULL AND paid_by = $1)
        )
    `;
    
    const result = await pool.query(query, [ownerId]);

    //return transactions with nextOccurrence as an ISO date string (YYYY-MM-DD) instead of a Date object
    return result.rows.map(row => ({
        ...row,
        nextOccurrence: row.nextOccurrence.toISOString().split('T')[0],
    }));
}

//crates new transactions for all due recurring transactions for a given user/owner. 
//Returns the number of transactions created.
export const processRecurringTransactionsForOwner = async (ownerId: string): Promise<number> => {
    const dueTemplates = await findDueRecurringTransactions(ownerId);
    const today = todayISODate();
    let createdCount = 0;

    for (const template of dueTemplates) {
        let occurrenceDate = template.nextOccurrence;

        //Create one transaction per missed interval
        while (occurrenceDate <= today) {
            await pool.query(
                `INSERT INTO transactions
                    (user_id, group_id, paid_by, type, amount, category_id, transaction_date, description, is_recurring, recurring_interval)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)`,
                [template.userId, template.groupId, template.paidBy, template.type, template.amount, template.categoryId, occurrenceDate, template.description, template.recurringInterval]
            );
            createdCount++;
            //set the next occurence for the newly created transaction based on the original's recurring interval. 
            occurrenceDate = calculateNextOccurrence(occurrenceDate, template.recurringInterval);
        }

        //Update the next_occurance now to avoid processing the same transaction twice.
        await pool.query(
            `UPDATE transactions SET next_occurrence = $1 WHERE id = $2`,
            [occurrenceDate, template.id]
        );
    }

    return createdCount;
}