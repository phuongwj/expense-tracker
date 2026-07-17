import pool from "../config/db.ts";
import { User, PublicUser, RefreshToken } from "./authModel.ts";

/**
 * Finds a user by their email address.
 * @param email - The email to search for.
 * @returns The matching user, or null if no user has that email.
 * @see authController.ts logIn - primary caller
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
    const query = `
        SELECT id, email, password_hash, first_name AS "firstName", last_name AS "lastName", created_at
        FROM users
        WHERE email = $1
    `;

    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
}

/**
 * Creates a new user record in the database.
 * @param firstName - The user's first name.
 * @param lastName - The user's last name.
 * @param email - The user's email address (assumed unique; caller should check beforehand).
 * @param passwordHash - The already-hashed password, never the plaintext.
 * @returns The newly created user, excluding the password hash.
 */
export const createUser = async (
    firstName: string,
    lastName: string,
    email: string,
    passwordHash: string
): Promise<PublicUser> => {
    const query = `
        INSERT INTO users (first_name, last_name, email, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id, first_name AS "firstName", last_name AS "lastName", email
    `;

    const result = await pool.query(query, [firstName, lastName, email, passwordHash]);
    return result.rows[0];
}

/**
 * Stores a new refresh token record.
 * @param userId - The owning user's id.
 * @param tokenHash - SHA-256 hash of the raw refresh token (the raw token is never stored).
 * @param expiresAt - When this token stops being valid.
 */
export const insertRefreshToken = async (
    userId: string,
    tokenHash: string,
    expiresAt: Date
): Promise<RefreshToken> => {
    const query = `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        RETURNING id, user_id AS "userId", token_hash AS "tokenHash", expires_at AS "expiresAt",
                  revoked_at AS "revokedAt", replaced_by_token_id AS "replacedByTokenId", created_at AS "createdAt"
    `;

    const result = await pool.query(query, [userId, tokenHash, expiresAt]);
    return result.rows[0];
}

/**
 * Finds a refresh token record by the hash of its raw value.
 * @param tokenHash - SHA-256 hash of the raw refresh token presented by the client.
 * @returns The matching record, or null if no token has that hash.
 */
export const findRefreshTokenByHash = async (tokenHash: string): Promise<RefreshToken | null> => {
    const query = `
        SELECT id, user_id AS "userId", token_hash AS "tokenHash", expires_at AS "expiresAt",
               revoked_at AS "revokedAt", replaced_by_token_id AS "replacedByTokenId", created_at AS "createdAt"
        FROM refresh_tokens
        WHERE token_hash = $1
    `;

    const result = await pool.query(query, [tokenHash]);
    return result.rows[0] || null;
}

/**
 * Revokes a single refresh token, optionally linking it to the token that replaced it (rotation).
 * @param id - The refresh token record to revoke.
 * @param replacedByTokenId - The id of the new token issued in its place, if any.
 */
export const revokeRefreshToken = async (id: string, replacedByTokenId?: string): Promise<void> => {
    const query = `
        UPDATE refresh_tokens
        SET revoked_at = now(), replaced_by_token_id = $2
        WHERE id = $1
    `;

    await pool.query(query, [id, replacedByTokenId ?? null]);
}

export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
    const query = `
        UPDATE refresh_tokens
        SET revoked_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL
    `;

    await pool.query(query, [userId]);
}
