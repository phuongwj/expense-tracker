import pool from "../config/db.ts";
import { Transaction, TransactionSplit } from "./transactionModel.ts";


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
        INSERT INTO transactions (userId, amount, type, categoryId, transactionDate, description, isRecurring, recurringInterval)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
            id,
            userId,
            groupId,
            paidBy,
            categoryId,
            type,
            amount,
            transactionDate ,
            description,
            isRecurring,
            recurringInterval
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
            userId,
            groupId,
            paidBy,
            categoryId,
            type,
            amount,
            transactionDate,
            description,
            isRecurring,
            recurringInterval
        FROM transactions
        WHERE userId = $1
        AND groupId IS NULL
    `;

    //params array will contain the different type values passed in the query params
    const params: any[] = [userId];

    //build up the final query based on which query parameters were sent in the request

    if (filters.startDate) {
         //the string `$${params.length+1}` gives the properly formatted sql placeholder. ex: $1, $2, $3 etc. 
        query += ` AND transactionDate >= $${params.length + 1}`;
        params.push(filters.startDate);
    }
    if (filters.endDate) {
        query += ` AND transactionDate <= $${params.length + 1}`;
        params.push(filters.endDate);
    }
    if (filters.type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(filters.type);
    }
    if (filters.categoryId) {
        query += ` AND categoryId = $${params.length + 1}`;
        params.push(filters.categoryId);
    }
    if (filters.isRecurring !== undefined) {
        query += ` AND isRecurring = $${params.length + 1}`;
        params.push(filters.isRecurring);
    }
    if (filters.recurringInterval) {
        query += ` AND recurringInterval = $${params.length + 1}`;
        params.push(filters.recurringInterval);
    }
    if (!filters.startDate && !filters.endDate) {
        query += ` AND transactionDate >= NOW() - INTERVAL '30 days'`;
    }

    query += ` ORDER BY transactionDate DESC`;

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
        SET amount = $1, type = $2, categoryId = $3, transactionDate = $4,
            description = $5, isRecurring = $6, recurringInterval = $7,
            updatedAt = now()
        WHERE id = $8 AND userId = $9 AND groupId IS NULL
        RETURNING
            id,
            userId,
            groupId,
            paidBy,
            categoryId,
            type,
            amount,
            transactionDate,
            description,
            isRecurring,
            recurringInterval
    `;

    const result = await pool.query(query, [amount, type, categoryId, transactionDate, description, isRecurring, recurringInterval, transactionId, userId]);
    return result.rows[0] || null;
}


export const deletePersonalTransaction = async (transactionId: string, userId: string): Promise<boolean> => {
    const query = `
        DELETE FROM transactions
        WHERE id = $1 AND userId = $2 AND groupId IS NULL
    `;

    const result = await pool.query(query, [transactionId, userId]);
    return (result.rowCount ?? 0) > 0;
}