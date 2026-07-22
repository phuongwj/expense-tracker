import { z } from "zod";

const csvRowSchema = z.object({
  date: z.string().trim(),
  description: z.string().trim(),
  amount: z.union([z.number(), z.string().trim()]),
  type: z.string().trim(),
  category: z.string().trim(),
});

export const importPreviewSchema = z.object({
  csvText: z.string().min(1, "csvText is required."),
});

export const importConfirmSchema = z.object({
  rows: z.array(csvRowSchema).min(1, "rows must contain at least one row."),
});

export const exportPreviewSchema = z.object({
  type: z.enum(["all", "income", "expense"]).optional(),
  category: z.string().trim().min(1).optional(),
  startDate: z.string().trim().min(1).optional(),
  endDate: z.string().trim().min(1).optional(),
});

export type ImportPreviewInput = z.infer<typeof importPreviewSchema>;
export type ImportConfirmInput = z.infer<typeof importConfirmSchema>;
export type ExportPreviewInput = z.infer<typeof exportPreviewSchema>;
