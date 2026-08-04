import pool from "../config/db.ts";
import {
  ExportPreviewRow,
  NormalizedImportRow,
  SavedImportedTransaction,
} from "./importExportModel.ts";
import { ExportPreviewInput } from "./importExportSchemas.ts";

const mapTransactionRow = (
  row: {
    id: string;
    date: string | Date;
    description: string | null;
    amount: string | number;
    type: "income" | "expense";
    category: string | null;
    createdAt: string | Date;
  },
  source: string
): ExportPreviewRow => ({
  id: row.id,
  date:
    typeof row.date === "string"
      ? row.date.slice(0, 10)
      : row.date.toISOString().slice(0, 10),
  description: row.description ?? "",
  amount: Number(row.amount),
  type: row.type,
  category: row.category ?? "Uncategorized",
  source,
  createdAt:
    typeof row.createdAt === "string"
      ? row.createdAt
      : row.createdAt.toISOString(),
});

export const insertImportedPersonalTransaction = async (
  userId: string,
  row: NormalizedImportRow,
  categoryId: string | null
): Promise<SavedImportedTransaction> => {
  const query = `
    INSERT INTO transactions (
      user_id,
      amount,
      type,
      category_id,
      transaction_date,
      description,
      is_recurring,
      recurring_interval
    )
    VALUES ($1, $2, $3, $4, $5, $6, FALSE, NULL)
    RETURNING
      id,
      transaction_date AS date,
      description,
      amount,
      type,
      created_at AS "createdAt"
  `;

  const result = await pool.query(query, [
    userId,
    row.amount,
    row.type,
    categoryId,
    row.date,
    row.description,
  ]);

  const savedRow = result.rows[0] as {
    id: string;
    date: string | Date;
    description: string | null;
    amount: string | number;
    type: "income" | "expense";
    createdAt: string | Date;
  };

  return {
    id: savedRow.id,
    date:
      typeof savedRow.date === "string"
        ? savedRow.date.slice(0, 10)
        : savedRow.date.toISOString().slice(0, 10),
    description: savedRow.description ?? "",
    amount: Number(savedRow.amount),
    type: savedRow.type,
    category: row.category,
    source: "csv_import",
    createdAt:
      typeof savedRow.createdAt === "string"
        ? savedRow.createdAt
        : savedRow.createdAt.toISOString(),
  };
};

export const getPersonalTransactionsForExport = async (
  userId: string,
  filters: ExportPreviewInput
): Promise<ExportPreviewRow[]> => {
  let query = `
    SELECT
      t.id,
      t.transaction_date AS date,
      t.description,
      t.amount,
      t.type,
      c.name AS category,
      t.created_at AS "createdAt"
    FROM transactions t
    LEFT JOIN categories c
      ON t.category_id = c.id
    WHERE t.user_id = $1
      AND t.group_id IS NULL
  `;

  const params: Array<string> = [userId];

  if (filters.type && filters.type !== "all") {
    query += ` AND t.type = $${params.length + 1}`;
    params.push(filters.type);
  }

  if (filters.category) {
    query += ` AND LOWER(COALESCE(c.name, '')) = LOWER($${params.length + 1})`;
    params.push(filters.category);
  }

  if (filters.startDate) {
    query += ` AND t.transaction_date >= $${params.length + 1}`;
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += ` AND t.transaction_date <= $${params.length + 1}`;
    params.push(filters.endDate);
  }

  query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows.map((row) =>
    mapTransactionRow(
      row as {
        id: string;
        date: string | Date;
        description: string | null;
        amount: string | number;
        type: "income" | "expense";
        category: string | null;
        createdAt: string | Date;
      },
      "personal_transaction"
    )
  );
};

export const getAllPersonalTransactionsForExport = async (
  userId: string
): Promise<ExportPreviewRow[]> => {
  return getPersonalTransactionsForExport(userId, {});
};

export const getGroupTransactionsForExport = async (
  groupId: string,
  filters: ExportPreviewInput
): Promise<ExportPreviewRow[]> => {
  let query = `
    SELECT
      t.id,
      t.transaction_date AS date,
      t.description,
      t.amount,
      t.type,
      c.name AS category,
      t.created_at AS "createdAt"
    FROM transactions t
    LEFT JOIN categories c
      ON t.category_id = c.id
    WHERE t.group_id = $1
  `;

  const params: Array<string> = [groupId];

  if (filters.type && filters.type !== "all") {
    query += ` AND t.type = $${params.length + 1}`;
    params.push(filters.type);
  }

  if (filters.category) {
    query += ` AND LOWER(COALESCE(c.name, '')) = LOWER($${params.length + 1})`;
    params.push(filters.category);
  }

  if (filters.startDate) {
    query += ` AND t.transaction_date >= $${params.length + 1}`;
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += ` AND t.transaction_date <= $${params.length + 1}`;
    params.push(filters.endDate);
  }

  query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows.map((row) =>
    mapTransactionRow(
      row as {
        id: string;
        date: string | Date;
        description: string | null;
        amount: string | number;
        type: "income" | "expense";
        category: string | null;
        createdAt: string | Date;
      },
      "group_transaction"
    )
  );
};

export const getAllGroupTransactionsForExport = async (
  groupId: string
): Promise<ExportPreviewRow[]> => {
  return getGroupTransactionsForExport(groupId, {});
};
