import { SavedMockTransaction } from "./importExportModel.ts";

const transactions: SavedMockTransaction[] = [];

export const addMockTransactions = (
  rows: SavedMockTransaction[]
): SavedMockTransaction[] => {
  transactions.push(...rows);
  return rows;
};

export const getMockTransactions = (): SavedMockTransaction[] => {
  return [...transactions];
};
