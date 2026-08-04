import {
  ExportPreviewInput,
  ImportConfirmInput,
} from "./importExportSchemas.ts";
import {
  createCategory,
  getUserCategories,
} from "../categories/categoryRepository.ts";
import {
  ExportPreviewRow,
  ExportPreviewSummary,
  ImportRowInput,
  InvalidImportRow,
  NormalizedImportRow,
  SavedImportedTransaction,
} from "./importExportModel.ts";
import {
  getAllPersonalTransactionsForExport,
  getPersonalTransactionsForExport,
  insertImportedPersonalTransaction,
} from "./importExportRepository.ts";

const REQUIRED_HEADERS = [
  "date",
  "description",
  "amount",
  "type",
  "category",
] as const;

const EXPORT_HEADERS = [
  "date",
  "description",
  "amount",
  "type",
  "category",
  "source",
  "createdAt",
] as const;

const isValidDateString = (value: string): boolean => {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const isoLike = /^\d{4}-\d{2}-\d{2}$/;
  if (isoLike.test(value)) {
    return parsed.toISOString().slice(0, 10) === value;
  }

  return true;
};

const normalizeDate = (value: string): string => {
  return new Date(value).toISOString().slice(0, 10);
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
};

export const parseCsvText = (csvText: string) => {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("CSV text is empty.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header)
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required CSV columns: ${missingHeaders.join(", ")}`
    );
  }

  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = REQUIRED_HEADERS.reduce<Record<string, string>>((acc, header) => {
      const headerIndex = headers.indexOf(header);
      acc[header] = values[headerIndex] ?? "";
      return acc;
    }, {});

    return {
      rowNumber: index + 2,
      row,
    };
  });

  return rows;
};

export const validateImportRow = (
  row: ImportRowInput,
  rowNumber: number
): { validRow?: NormalizedImportRow; invalidRow?: InvalidImportRow } => {
  const rawRow = {
    date: String(row.date ?? "").trim(),
    description: String(row.description ?? "").trim(),
    amount: String(row.amount ?? "").trim(),
    type: String(row.type ?? "").trim().toLowerCase(),
    category: String(row.category ?? "").trim(),
  };

  const errors: string[] = [];
  const numericAmount = Number(rawRow.amount);

  if (!rawRow.date) {
    errors.push("date is required");
  } else if (!isValidDateString(rawRow.date)) {
    errors.push("date must be a valid date");
  }

  if (!rawRow.description) {
    errors.push("description is required");
  }

  if (!rawRow.amount) {
    errors.push("amount is required");
  } else if (Number.isNaN(numericAmount)) {
    errors.push("amount must be a valid number");
  } else if (numericAmount <= 0) {
    errors.push("amount must be a positive number");
  }

  if (!rawRow.type) {
    errors.push("type is required");
  } else if (!["income", "expense"].includes(rawRow.type)) {
    errors.push("type must be income or expense");
  }

  if (!rawRow.category) {
    errors.push("category is required");
  }

  if (errors.length > 0) {
    return {
      invalidRow: {
        rowNumber,
        row: rawRow,
        errors,
      },
    };
  }

  return {
    validRow: {
      date: normalizeDate(rawRow.date),
      description: rawRow.description,
      amount: numericAmount,
      type: rawRow.type as "income" | "expense",
      category: rawRow.category,
    },
  };
};

export const buildImportPreview = (csvText: string) => {
  const parsedRows = parseCsvText(csvText);
  const validRows: NormalizedImportRow[] = [];
  const invalidRows: InvalidImportRow[] = [];

  for (const parsedRow of parsedRows) {
    const result = validateImportRow(parsedRow.row, parsedRow.rowNumber);
    if (result.validRow) {
      validRows.push(result.validRow);
    }
    if (result.invalidRow) {
      invalidRows.push(result.invalidRow);
    }
  }

  return {
    summary: {
      totalRows: parsedRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
    },
    validRows,
    invalidRows,
  };
};

const findCategoryIdByName = (
  categories: Array<{ id: string; name: string }>,
  categoryName: string
): string | null => {
  const match = categories.find(
    (category) =>
      category.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
  );

  return match?.id ?? null;
};

const getOrCreateCategoryId = async (
  userId: string,
  categoryName: string,
  categories: Array<{ id: string; name: string; userId: string }>
): Promise<string | null> => {
  const existingCategoryId = findCategoryIdByName(categories, categoryName);
  if (existingCategoryId) {
    return existingCategoryId;
  }

  try {
    const category = await createCategory(categoryName, userId);
    categories.push(category);
    return category.id;
  } catch {
    const refreshedCategories = await getUserCategories(userId);
    categories.splice(0, categories.length, ...refreshedCategories);
    return findCategoryIdByName(categories, categoryName);
  }
};

export const confirmImportRows = async (
  userId: string,
  input: ImportConfirmInput
) => {
  const savedTransactions: SavedImportedTransaction[] = [];
  const skippedRows: InvalidImportRow[] = [];
  const categories = await getUserCategories(userId);

  for (const [index, row] of input.rows.entries()) {
    const result = validateImportRow(row, index + 1);

    if (result.validRow) {
      const categoryId = await getOrCreateCategoryId(
        userId,
        result.validRow.category,
        categories
      );

      const savedTransaction = await insertImportedPersonalTransaction(
        userId,
        result.validRow,
        categoryId
      );
      savedTransactions.push(savedTransaction);
    }

    if (result.invalidRow) {
      skippedRows.push(result.invalidRow);
    }
  }

  return {
    savedCount: savedTransactions.length,
    skippedCount: skippedRows.length,
    savedTransactions,
    skippedRows,
  };
};

export const buildExportPreview = async (
  userId: string,
  filters: ExportPreviewInput
) => {
  const rows = await getPersonalTransactionsForExport(userId, filters);
  const totalIncome = rows
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + row.amount, 0);
  const totalExpenses = rows
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + row.amount, 0);

  const summary: ExportPreviewSummary = {
    rowCount: rows.length,
    totalIncome,
    totalExpenses,
    netAmount: totalIncome - totalExpenses,
  };

  return {
    summary,
    rows,
  };
};

const escapeCsvValue = (value: string | number): string => {
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const buildExportCsv = async (userId: string) => {
  const rows = await getAllPersonalTransactionsForExport(userId);
  const headerRow = EXPORT_HEADERS.join(",");
  const csvRows = rows.map((row) =>
    EXPORT_HEADERS.map((header) => escapeCsvValue(row[header])).join(",")
  );

  return [headerRow, ...csvRows].join("\n");
};
