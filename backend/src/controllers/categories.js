import pool from '../connections/postgres.js';
import categoryQueries from '../sql/categoryQueries.js';


//returns user-specific and system-wide categories
const getCategories = async (req, res) => {
    //from auth middleware
    const userId = req.user.userId;

    try {
        const result = await pool.query(
            categoryQueries.getUserCategories,
            [userId]
        );

        res.status(200).json({ categories: result.rows });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve categories. Please try again later.' });
    }
};

const createCategory = async (req, res) => {
    const userId = req.user.userId;
    const { name } = req.body;

    try {
        const result = await pool.query(
            categoryQueries.createCategory,
            [name, userId]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create category. Please try again later.' });
    }
};

const updateCategory = async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name } = req.body;

    try {
        const result = await pool.query(
            categoryQueries.updateCategory,
            [name, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update category. Please try again later.' });
    }
};

const deleteCategory = async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;

    try {
        const result = await pool.query(
            categoryQueries.deleteCategory,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.status(200).json({ message: 'Category deleted successfully', id: result.rows[0].id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete category. Please try again later.' });
    }
};

export default { getCategories, createCategory, updateCategory, deleteCategory };