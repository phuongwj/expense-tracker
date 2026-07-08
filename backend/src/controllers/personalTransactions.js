import pool from '../connections/postgres.js';
import transactionQueries from '../sql/transactionQueries.js';

const getPersonalTransactions = async (req, res) => {
    //from auth middleware
    const userId = req.user.userId;

    //check for optional query parameters, validated by middleware
    const { startDate, endDate, type, category_id, is_recurring, recurring_interval } = req.query;

    try {

        const { query, params } = transactionQueries.buildGetQueryWithFilters(
            transactionQueries.getPersonalTransactions,
            userId,
            { startDate, endDate, type, category_id, is_recurring, recurring_interval }
        );

        const result = await pool.query(query, params);
        res.status(200).json({ transactions: result.rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve transactions. Please try again later.' });
    }
};

const createPersonalTransaction = async (req, res) => {

    //from the auth middleware
    const userId = req.user.userId;

    //field types validated in the validation middleware
    const { type, amount, category_id, transaction_date, description, is_recurring, recurring_interval } = req.body;

    const interval = is_recurring ? recurring_interval : null;

    try {

        const result = await pool.query(
            transactionQueries.createPersonalTransaction,
            [userId, amount, type, category_id, transaction_date, description, is_recurring ?? false, interval]
);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create transaction. Please try again later.' });
    }
    
};


const updatePersonalTransaction = async (req, res) => {

    const userId = req.user.userId;
    const transactionId = req.params.id;

    //validated in middleware
    const {
        type,
        amount,
        category_id,
        transaction_date,
        description,
        is_recurring,
        recurring_interval
    } = req.body;

    const interval = is_recurring ? recurring_interval : null;

    try {

        const result = await pool.query(
            transactionQueries.updatePersonalTransaction,
            [
                type,
                amount,
                category_id,
                transaction_date,
                description,
                is_recurring,
                interval,
                transactionId,
                userId
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "Transaction not found."
            });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to update transaction."
        });
    }
};

const deletePersonalTransaction = async (req, res) => {

    const userId = req.user.userId;
    const transactionId = req.params.id;

    try {

        const result = await pool.query(
            transactionQueries.deletePersonalTransaction,
            [transactionId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "Transaction not found."
            });
        }

        res.status(200).json({ message: 'Transaction deleted successfully', id: result.rows[0].id });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to delete transaction."
        });
    }
};

//for the dashboard summary
const getPersonalTransactionSummary = async (req, res) => {
    const userId = req.user.userId;

    //start and end dates are optional, if null the SQL query coalesces to the last 30 days
    const { startDate, endDate } = req.query;
    const start = startDate || null;
    const end = endDate || null;

    try {
        const result = await pool.query(
            transactionQueries.getAmountsByCategory,
            [userId, start, end]
        );

        //use result data to calculate totals and by-category breakdown
        let totalIncome = 0;
        let totalExpenses = 0;
        //catagoryData maps each category to an object containing: The category name, the total expense/income amounts for that category.
        const categoryData = {};


        for (const row of result.rows) {
            const amount = parseFloat(row.amount);
            const isIncome = row.type === 'income';

            if (!categoryMap.has(row.category)) {
                categoryMap.set(row.category, { category: row.category, income: 0, expense: 0 });
            }

            if (isIncome) {
                totalIncome += amount;
                categoryMap.get(row.category).income += amount;
            } else {
                totalExpenses += amount;
                categoryMap.get(row.category).expense += amount;
            }
        }

        res.status(200).json({
            startDate: start,
            endDate: end,
            totalIncome,
            totalExpenses,
            //issue with returning map as JSON, so convering to array containing each an object for each category
            byCategory: Array.from(categoryMap.values())
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve transaction summary. Please try again later.' });
    }
};

export default {
    getPersonalTransactions,
    createPersonalTransaction,
    updatePersonalTransaction,
    deletePersonalTransaction
};