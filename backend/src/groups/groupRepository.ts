import pool from "../config/db.ts";
import { Group, GroupWithRole, MemberInfo } from "./groupModel.ts";

export const createGroup = async (
    name: string,
    joinCode: string,
    createdBy: string
): Promise<Group> => {
    const query = `
        INSERT INTO groups (name, join_code, created_by)
        VALUES ($1, $2, $3)
        RETURNING id, name, join_code AS "joinCode", created_by AS "createdBy",
                  created_at AS "createdAt", updated_at AS "updatedAt"
    `;

    const result = await pool.query(query, [name, joinCode, createdBy]);
    return result.rows[0];
};

export const addMember = async (
    groupId: string,
    userId: string,
    role: string
): Promise<void> => {
    const query = `
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, $3)
    `;

    await pool.query(query, [groupId, userId, role]);
};

export const findGroupByJoinCode = async (
    joinCode: string
): Promise<{ id: string; name: string } | null> => {
    const query = `
        SELECT id, name
        FROM groups
        WHERE join_code = $1
    `;

    const result = await pool.query(query, [joinCode]);
    return result.rows[0] || null;
};

export const findMembership = async (
    groupId: string,
    userId: string
): Promise<{ role: string } | null> => {
    const query = `
        SELECT role
        FROM group_members
        WHERE group_id = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [groupId, userId]);
    return result.rows[0] || null;
};

export const findGroupsByUserId = async (userId: string): Promise<GroupWithRole[]> => {
    const query = `
        SELECT g.id, g.name, gm.role
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = $1
        ORDER BY g.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
};

export const findGroupById = async (groupId: string): Promise<Group | null> => {
    const query = `
        SELECT id, name, join_code AS "joinCode", created_by AS "createdBy",
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM groups
        WHERE id = $1
    `;

    const result = await pool.query(query, [groupId]);
    return result.rows[0] || null;
};

export const findGroupMembers = async (groupId: string): Promise<MemberInfo[]> => {
    const query = `
        SELECT u.id AS "userId", u.first_name AS "firstName", u.last_name AS "lastName",
               gm.role, gm.joined_at AS "joinedAt"
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = $1
        ORDER BY gm.joined_at
    `;

    const result = await pool.query(query, [groupId]);
    return result.rows;
};

export const updateJoinCode = async (groupId: string, newCode: string): Promise<void> => {
    const query = `
        UPDATE groups
        SET join_code = $1, updated_at = now()
        WHERE id = $2
    `;

    await pool.query(query, [newCode, groupId]);
};

export const removeMember = async (groupId: string, userId: string): Promise<void> => {
    const query = `
        DELETE FROM group_members
        WHERE group_id = $1 AND user_id = $2
    `;

    await pool.query(query, [groupId, userId]);
};

export const deleteGroup = async (groupId: string): Promise<void> => {
    const query = `
        DELETE FROM groups
        WHERE id = $1
    `;

    await pool.query(query, [groupId]);
};

export const countMembers = async (groupId: string): Promise<number> => {
    const query = `
        SELECT COUNT(*) AS count
        FROM group_members
        WHERE group_id = $1
    `;

    const result = await pool.query(query, [groupId]);
    return Number(result.rows[0].count);
};
