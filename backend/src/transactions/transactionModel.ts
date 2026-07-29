export interface Transaction {
    id: string;
    userId: string;
    groupId: number | null; //temporary until Group Entity is added, then this will get changed to string | null
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

export interface Settlement {
    id: string;
    groupId: string;
    paidBy: string;
    paidTo: string;
    amount: number;
    settledAt: Date;
}

//Used for Settlement-related queries, contains two userIDs (one who owes the other)
export interface BalanceRow {
    owes: string;
    isOwed: string;
    amount: string;
}