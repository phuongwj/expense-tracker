export interface Transaction {
    id: string;
    userId: string;
    groupId: string | null;
    paidBy: string | null;
    categoryId: string | null;
    type: 'expense' | 'income';
    amount: number;
    transactionDate: Date;
    description: string | null;
    isRecurring: boolean;
    recurringInterval: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null;
}

export interface TransactionSplit {
    id: string;
    transactionId: string;
    userId: string;
    amount: number;
}