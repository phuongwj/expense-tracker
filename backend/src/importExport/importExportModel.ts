export type TransactionType = "income" | "expense";

export interface ImportRowInput {
  date: string;
  description: string;
  amount: number | string;
  type: TransactionType | string;
  category: string;
}

export interface NormalizedImportRow {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
}

export interface InvalidImportRow {
  rowNumber: number;
  row: Record<string, string>;
  errors: string[];
}

export interface SavedMockTransaction extends NormalizedImportRow {
  id: string;
  source: "csv_import";
  createdAt: string;
}

export interface ExportPreviewSummary {
  rowCount: number;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
}
