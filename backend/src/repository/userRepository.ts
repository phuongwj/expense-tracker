import pool from "../config/db.ts";
import { User, PublicUser } from "../model/user.ts";

/**
 * Finds a user by their email address.
 * @param email - The email to search for.
 * @returns The matching user, or null if no user has that email.
 * @see userController.ts logIn - primary caller
 */ 
export const findUserByEmail = async (email: string): Promise<User | null> => {
    const query = `
        SELECT * FROM users
        WHERE email = $1
    `;

    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
}

/**
 * Creates a new user record in the database.
 * @param name - The user's display name.
 * @param email - The user's email address (assumed unique; caller should check beforehand).
 * @param dpasswordHash - The already-hashed password, never the plaintext.
 * @returns The newly created user, excluding the password hash.
 */
export const createUser = async (
    name: string,
    email: string,
    passwordHash: string
): Promise<PublicUser> => {
    const query = `
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, created_at
    `;

    const result = await pool.query(query, [name, email, passwordHash]);
    return result.rows[0];
}