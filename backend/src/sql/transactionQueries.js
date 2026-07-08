
//**Personal Transaction Queries */
const getPersonalTransactions = `
    SELECT * FROM transactions 
    WHERE user_id = $1 
    AND group_id IS NULL`;

const createPersonalTransaction = `
    INSERT INTO transactions (user_id, amount, type, category_id, transaction_date, description, is_recurring, recurring_interval) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;

const updatePersonalTransaction = `
    UPDATE transactions SET amount = $1, type = $2, category_id = $3, transaction_date = $4, 
        description = $5, is_recurring = $6, recurring_interval = $7 
    WHERE id = $8 AND user_id = $9 
    AND group_id IS NULL RETURNING *`;

const deletePersonalTransaction = `
    DELETE FROM transactions 
    WHERE id = $1 
    AND user_id = $2 
    AND group_id IS NULL RETURNING *`;


// **Group Transaction Queries */ 

const getGroupTransactions = `
    SELECT * FROM transactions 
    WHERE group_id = $1`;

const createGroupTransaction = `
    INSERT INTO transactions (user_id, group_id, type, amount, category_id, transaction_date, 
        description, is_recurring, recurring_interval) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;

const updateGroupTransaction = `
    UPDATE transactions SET type = $1, amount = $2, category_id = $3, transaction_date = $4, 
        description = $5, is_recurring = $6, recurring_interval = $7 
    WHERE id = $8 
    AND group_id IS NOT NULL RETURNING *`;

const deleteGroupTransaction = `
    DELETE FROM transactions 
    WHERE id = $1 
    AND group_id IS NOT NULL RETURNING *`;


const insertTransactionSplits = `
    INSERT INTO transaction_splits (transaction_id, user_id, amount) 
    VALUES ($1, $2, $3)`;


//**Queries for Dashboard-Summaries */

const getAmountsByCategory = `
    SELECT 
        t.type,
        COALESCE(c.name, 'Uncategorized') as category,
        SUM(t.amount) as amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1
    AND t.group_id IS NULL
    AND t.transaction_date >= COALESCE($2, NOW() - INTERVAL '30 days')
    AND t.transaction_date <= COALESCE($3, CURRENT_DATE)
    GROUP BY t.type, c.name
    ORDER BY t.type, amount DESC
`

//helper function to dynamically build GET query based on optional query parameters
//id can refer to either userId or groupId, depending on which type of transaction is being queried
const buildGetQueryWithFilters = (baseQuery, id, filters) => {
    let query = baseQuery;

    const params = [id];
    
    //$(params.length + 1) gives the placeholder value for the query. ex: '$1', '$2', etc. 
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

    if (filters.category_id) {
        query += ` AND category_id = $${params.length + 1}`;
        params.push(filters.category_id);
    }

    if (filters.is_recurring !== undefined) {
        query += ` AND is_recurring = $${params.length + 1}`;
        params.push(filters.is_recurring === 'true');
    }

    if (filters.recurring_interval) {
        query += ` AND recurring_interval = $${params.length + 1}`;
        params.push(filters.recurring_interval);
    }

    //If user didnt give start/end dates, default to last 30 days
    if (! (filters.startDate || filters.endDate) ) {
        query += ` AND transaction_date >= NOW() - INTERVAL '30 days'`;
    }

    query += ` ORDER BY transaction_date DESC`;

    return { query, params };
};

export default {
    getPersonalTransactions,
    createPersonalTransaction,
    updatePersonalTransaction,
    deletePersonalTransaction,
    insertTransactionSplits,
    getGroupTransactions,
    createGroupTransaction,
    updateGroupTransaction,
    deleteGroupTransaction,
    getAmountsByCategory,
    buildGetQueryWithFilters
}