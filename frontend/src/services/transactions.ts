
import api from "./api";


//parent interface shared between personal & group transactions
export interface Transaction {
  id: string
  userId: string
  paidBy: string
  categoryId: string | null
  category: string | null
  type: 'expense' | 'income'
  amount: number
  transactionDate: string
  description: string | null
  isRecurring: boolean
  recurringInterval: string | null
}

export interface PersonalTransaction extends Transaction {
  groupId: null
}

export interface GroupTransaction extends Transaction {
  groupId: string
  splits?: {
    userId: string
    amount: number
  }[]
}

export interface TransactionInput {
  type: 'expense' | 'income'
  amount: number
  categoryId?: string | null
  transactionDate: string
  description?: string | null
  isRecurring?: boolean
  recurringInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null
}

export interface GroupTransactionInput extends TransactionInput {
  paidBy?: string
  splits?: {
    userId: string
    amount: number
  }[]
}

export interface TransactionFilters {
  startDate?: string
  endDate?: string
  type?: 'expense' | 'income'
  categoryId?: string
  isRecurring?: boolean
  recurringInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
}

export interface SettlementInput {
  repayingUserId: string
  amount: number
}


//Gets transactions and casts amount to Number so that rest of frontend can calculate on it directly
export async function getPersonalTransactions(
  filters?: TransactionFilters
) {
  const response = await api.get('/transactions', {
    params: filters
  });

  return response.data.transactions.map((transaction: Transaction) => ({
    ...transaction,
    amount: Number(transaction.amount),
  }));
}

export async function createPersonalTransaction(
  transaction: TransactionInput
) {
  const response = await api.post(
    '/transactions',
    transaction
  );

  return response.data;
}

export async function updatePersonalTransaction(
  transactionId: string,
  transaction: TransactionInput
) {
  const response = await api.put(
    `/transactions/${transactionId}`,
    transaction
  );

  return response.data;
}

export async function deletePersonalTransaction(
  transactionId: string
) {
  await api.delete(`/transactions/${transactionId}`);
}

export async function createGroupTransaction(
  groupId: string,
  transaction: GroupTransactionInput
) {
  const response = await api.post(
    `/transactions/group/${groupId}`,
    transaction
  )

  return response.data
}

export async function getGroupTransactions(
  groupId: string,
  filters?: TransactionFilters
) {
  const response = await api.get(
    `/transactions/group/${groupId}`,
    {
      params: filters
    }
  );

  return response.data.transactions;
}

export async function updateGroupTransaction(
  groupId: string,
  transactionId: string,
  transaction: TransactionInput
) {
  const response = await api.put(
    `/transactions/group/${groupId}/${transactionId}`,
    transaction
  );

  return response.data;
}

export async function deleteGroupTransaction(
  groupId: string,
  transactionId: string
) {
  await api.delete(
    `/transactions/group/${groupId}/${transactionId}`
  );
}

export interface Balance {
  userId: string
  amount: number
  direction: 'you_owe' | 'owes_you'
}

export interface GlobalBalancesResponse {
  balances: Balance[]
  summary: {
    totalOwedByYou: number
    totalOwedToYou: number
    net: number
  }
}

export interface GroupBalancesResponse {
  groupId: string
  balances: Balance[]
}

export async function getGroupBalances(groupId: string) {
  const response = await api.get(
    `/transactions/group/${groupId}/balances`
  );

  return response.data;
}

export async function getGlobalBalances() {
  const response = await api.get('/transactions/balances');

  return response.data;
}

export async function createSettlement(
  groupId: string,
  settlement: SettlementInput
) {
  const response = await api.post(
    `/transactions/group/${groupId}/settlements`,
    settlement
  );

  return response.data;
}