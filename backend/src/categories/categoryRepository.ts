import pool from "../config/db.ts";
import { Category } from "./categoryModel.ts";

export const createCategory = async (
    name: string,
    userId: string,
): Promise<Category> => {
    const query = `
        INSERT INTO categories (name, user_id)
        VALUES ($1, $2)
        RETURNING
            id,
            name,
            user_id AS "userId"
    `;
    const result = await pool.query(query, [name, userId]);
    return result.rows[0];
}

export const getUserCategories = async (
    userId: string,
): Promise<Category[]> => {
    const query = `
        SELECT
            id,
            name,
            user_id AS "userId"
        FROM categories
        WHERE user_id = $1
           OR user_id IS NULL
        ORDER BY name
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
};

export const updateCategory = async (
    id: string,
    name: string,
    userId: string,
): Promise<Category | null> => {
    const query = `
        UPDATE categories
        SET name = $1
        WHERE id = $2
          AND user_id = $3
        RETURNING
            id,
            name,
            user_id AS "userId"
    `;

    const result = await pool.query(query, [name, id, userId]);
    return result.rows[0] ?? null;
};

export const deleteCategory = async (
    id: string,
    userId: string,
): Promise<Category | null> => {
    const query = `
        DELETE FROM categories
        WHERE id = $1
          AND user_id = $2
        RETURNING
            id,
            name,
            user_id AS "userId"
    `;

    const result = await pool.query(query, [id, userId]);
    return result.rows[0] ?? null;
};