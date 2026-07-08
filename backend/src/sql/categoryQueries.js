const createCategory = `INSERT INTO categories (name, user_id) VALUES ($1, $2) RETURNING *`;

const getUserCategories = `SELECT * FROM categories WHERE user_id = $1 OR user_id IS NULL ORDER BY name`;

const updateCategory = `UPDATE categories SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *`;      

const deleteCategory = `DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *`;


export default {
    createCategory,
    getUserCategories,
    updateCategory,
    deleteCategory
};