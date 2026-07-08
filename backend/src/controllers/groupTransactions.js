import pool from '../connections/postgres.js';
import transactionQueries from '../sql/transactionQueries.js';


// *Note*: Assumes group membership middleware has already verified the user belongs to this group
// and that RBAC (leader vs member) has been checked before reaching this handler

const getGroupTransactions = async (req, res) => {

    const groupId = req.params.groupId;

    //check for optional query parameters, validated by middleware
    const { startDate, endDate, type, category_id, is_recurring, recurring_interval } = req.query;

    try {

        const { query, params } = transactionQueries.buildGetQueryWithFilters(
            transactionQueries.getGroupTransactions,
            groupId,
            { startDate, endDate, type, category_id, is_recurring, recurring_interval }
        );

        const result = await pool.query(query, params);
        res.status(200).json({ transactions: result.rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve transactions. Please try again later.' });
    }
};

const createGroupTransaction = async (req, res) => {

    const userId = req.user.id;

    //field types validated in the validation middleware
    const { type, amount, category_id, transaction_date, description, is_recurring, recurring_interval, splits } = req.body;

    const interval = is_recurring ? recurring_interval : null;

    //groupId validated in middleware
    const groupId = req.params.groupId;

    try {

        const result = await pool.query(
            transactionQueries.createGroupTransaction,
            [userId, groupId, type, amount, category_id, transaction_date, description, is_recurring ?? false, interval]
        );

        
        //add group member splits    
        if (result && splits) {
            await insertTransactionSplits(result.rows[0].id, splits);
        }


        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create transaction. Please try again later.' });
    }
    
};

//Helper function that inserts splits for a group 
const insertTransactionSplits = async (transactionId, splits) => {
    //splits is an array of objects containing { userId, amount }
    for (const split of splits) {
        await pool.query(
            transactionQueries.insertTransactionSplits,
            [transactionId, split.userId, split.amount]
        );
    }
};


const updateGroupTransaction = async (req, res) => {

    const transactionId = req.params.id;

    //validated in middleware
    const {
        type,
        amount,
        category_id,
        transaction_date,
        is_recurring,
        recurring_interval
    } = req.body;

    const interval = is_recurring ? recurring_interval : null;

    try {

        const result = await pool.query(
            transactionQueries.updateGroupTransaction,
            [
                type,
                amount,
                category_id,
                transaction_date,
                is_recurring,
                interval,
                transactionId,
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

const deleteGroupTransaction = async (req, res) => {

  
    const transactionId = req.params.id;

    try {

        const result = await pool.query(
            transactionQueries.deleteGroupTransaction,
            [transactionId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "Transaction not found."
            });
        }

        res.status(204).send();

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to delete transaction."
        });
    }
};

export default {
    getGroupTransactions,
    createGroupTransaction,
    updateGroupTransaction,
    deleteGroupTransaction
};