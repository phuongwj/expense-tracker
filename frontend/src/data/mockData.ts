export interface Transaction {
  id: string
  description: string
  category: string
  date: string
  amount: number // negative = expense, positive = income
  type: 'Individual' | 'Group'
  recurring?: boolean
  icon: string
}

export const transactions: Transaction[] = [
  { id: 't1', description: 'Scholarship deposit', category: 'Income', date: 'May 8, 2026', amount: 1800.0, type: 'Individual', icon: '💼' },
  { id: 't2', description: 'Netflix', category: 'Entertainment', date: 'May 8, 2026', amount: -17.99, type: 'Individual', recurring: true, icon: '📺' },
  { id: 't3', description: 'Textbooks (CSCI 4177)', category: 'Education', date: 'May 7, 2026', amount: -124.99, type: 'Individual', icon: '📘' },
  { id: 't4', description: 'Superstore groceries', category: 'Food & Grocery', date: 'May 5, 2026', amount: -87.4, type: 'Individual', icon: '🛒' },
  { id: 't5', description: 'Part-time job', category: 'Income', date: 'May 3, 2026', amount: 600.0, type: 'Individual', icon: '💼' },
  { id: 't6', description: 'Rent payment', category: 'Housing', date: 'May 1, 2026', amount: -900.0, type: 'Individual', recurring: true, icon: '🏠' },
]

export const categories = [
  { name: 'Grocery', icon: '🛒' },
  { name: 'Food', icon: '🍽️' },
  { name: 'Housing', icon: '🏠' },
  { name: 'Education', icon: '📘' },
  { name: 'Transport', icon: '🚌' },
]

export interface Group {
  id: string
  name: string
  icon: string
  members: { id: string; initials: string; name: string; role?: string; color: string; balance?: number }[]
  transactionCount: number
  lastActive: string
  balanceLabel: string
  balanceAmount: number // positive = owed to you, negative = you owe, 0 = settled
  counterparty?: string // who you owe / who owes you, for display
}

export const groups: Group[] = [
  {
    id: 'g1',
    name: 'Dal Apartment 2B',
    icon: '🏢',
    members: [
      { id: 'ac', initials: 'AC', name: 'Alex Chen', role: 'Admin', color: '#2D5240' },
      { id: 'jl', initials: 'JL', name: 'Jordan Lee', color: '#7C5CBF', balance: -45.3 },
      { id: 'mk', initials: 'MK', name: 'Maya Kim', color: '#C99A3B', balance: 22.1 },
      { id: 'sr', initials: 'SR', name: 'Sam Roy', color: '#B14B4B', balance: 0 },
    ],
    transactionCount: 8,
    lastActive: 'today',
    balanceLabel: 'You owe $45.30',
    balanceAmount: -45.3,
    counterparty: 'Jordan Lee',
  },
  {
    id: 'g2',
    name: 'CSCI 4177 Study Group',
    icon: '🎓',
    members: [
      { id: 'ac', initials: 'AC', name: 'Alex Chen', color: '#2D5240' },
      { id: 'jl', initials: 'JL', name: 'Jordan Lee', color: '#7C5CBF', balance: 0 },
      { id: 'tn', initials: 'TN', name: 'Tina Nguyen', color: '#2F7A8C', balance: 12.0 },
    ],
    transactionCount: 3,
    lastActive: 'May 7',
    balanceLabel: 'Owed $12.00',
    balanceAmount: 12.0,
    counterparty: 'Tina Nguyen',
  },
  {
    id: 'g3',
    name: 'Weekend Trip',
    icon: '🎉',
    members: [
      { id: 'ac', initials: 'AC', name: 'Alex Chen', color: '#2D5240' },
      { id: 'jl', initials: 'JL', name: 'Jordan Lee', color: '#7C5CBF', balance: 0 },
      { id: 'mk', initials: 'MK', name: 'Maya Kim', color: '#C99A3B', balance: 0 },
      { id: 'sr', initials: 'SR', name: 'Sam Roy', color: '#B14B4B', balance: 0 },
      { id: 'x', initials: '+1', name: 'and 1 more', color: '#8A8A80', balance: 0 },
    ],
    transactionCount: 12,
    lastActive: 'Apr 28',
    balanceLabel: 'All settled',
    balanceAmount: 0,
  },
]

export interface GroupExpense {
  id: string
  description: string
  icon: string
  paidBy: string
  date: string
  total: number
  shareLabel: string
  recurring?: boolean
}

export const groupExpenses: Record<string, GroupExpense[]> = {
  g1: [
    { id: 'ge1', description: 'Costco groceries', icon: '🛒', paidBy: 'Jordan Lee', date: 'May 8', total: 181.2, shareLabel: 'Your share: $45.30' },
    { id: 'ge2', description: 'Electricity bill', icon: '⚡', paidBy: 'you', date: 'May 1', total: 88.4, shareLabel: 'Owed $66.30' },
    { id: 'ge3', description: 'Internet (Rogers)', icon: '🌐', paidBy: 'Maya', date: 'Apr 28', total: 88.0, shareLabel: 'Your share: $22.00', recurring: true },
  ],
  g2: [
    { id: 'ge4', description: 'Printed course notes', icon: '🖨️', paidBy: 'Tina Nguyen', date: 'May 7', total: 24.0, shareLabel: 'Owed $8.00' },
  ],
  g3: [
    { id: 'ge5', description: 'Cabin rental', icon: '🏡', paidBy: 'you', date: 'Apr 28', total: 480.0, shareLabel: 'Settled' },
  ],
}