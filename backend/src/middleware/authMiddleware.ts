import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import pool from "../config/db.ts";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const requireGroupMember = async (req: Request, res: Response, next: NextFunction) => {
  const groupId = req.params.groupId;

  if (!groupId) {
    return res.status(400).json({ error: 'Group ID is required.' });
  }

  const result = await pool.query(
    `SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, req.userId]
  );

  if (result.rows.length === 0) {
    return res.status(403).json({ error: 'You are not a member of this group.' });
  }

  next();
};
