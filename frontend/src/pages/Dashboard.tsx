import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import AddTransactionModal from '../components/AddTransactionModal'
import { groups } from '../data/mockData'
import { getPersonalTransactions, type Transaction } from "../services/transactions";

export default function Dashboard() {
  const [addOpen, setAddOpen] = useState(false)
  const [view, setView] = useState('personal')
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  async function loadTransactions() {
    const data = await getPersonalTransactions();
    setTransactions(data);
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString();
  }

  //functions that use the fetched transactions to calculate current balance, expenses & income
  function calculateBalance() {
    return transactions.reduce((balance, transaction) => {
      if (transaction.type === "income") {
        return balance + Number(transaction.amount);
      }

      return balance - Number(transaction.amount);
    }, 0);
  }

  function calculateIncome() {
    return transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + Number(transaction.amount), 0);
  }

  function calculateExpenses() {
    return transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + Number(transaction.amount), 0);
  }

  const currentBalance = calculateBalance();
  const income = calculateIncome();
  const expenses = calculateExpenses();

  const mostRecent = transactions.slice(0, 5);
  return (
    <Layout
      title="Dashboard"
      headerActions={
        <>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="h-9 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-700"
          >
            <option value="personal">📍 Personal View</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                👥 {g.name}
              </option>
            ))}
          </select>
          <button className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">🔔</button>
          <button
            onClick={() => setAddOpen(true)}
            className="h-9 px-4 rounded-lg bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] flex items-center gap-1"
          >
            + Add Transaction <span className="text-[10px] border border-white/30 rounded px-1 ml-1">T</span>
          </button>
        </>
      }
    >
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
  
      <Card
        label="Current balance"
        value={`$${currentBalance.toFixed(2)}`}
        sub="Updated from transactions"
      />

      <Card
        label="Income"
        value={`+$${income.toFixed(2)}`}
        valueClass="text-green-700"
        sub={`${transactions.filter(t => t.type === "income").length} transactions`}
      />

      <Card
        label="Expenses"
        value={`−$${expenses.toFixed(2)}`}
        valueClass="text-red-700"
        sub={`${transactions.filter(t => t.type === "expense").length} transactions`}
      />
</div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
          <Link to="/transactions" className="text-sm text-[#3D6B4F] font-medium hover:underline">
            See all →
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {mostRecent.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">

                <div>
                  <div className="text-sm font-medium text-gray-900">{t.description}</div>
                  <div className="text-xs text-gray-400">
                    {t.category ?? ""} · {formatDate(t.transactionDate)}
                  </div>
                </div>
              </div>
              <div className={`text-sm font-semibold ${ 
                  t.type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
                {t.type === 'expense' ? '−' : '+'}${Number(t.amount).toFixed(2)}  
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Group Balances</h2>
          <Link to="/groups" className="text-sm text-[#3D6B4F] font-medium hover:underline">
            View groups →
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {groups.map((g) => (
            <div
              key={g.id}
              className={`rounded-xl px-4 py-3 ${
                g.balanceAmount < 0 ? 'bg-red-50' : g.balanceAmount > 0 ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium text-gray-900">{g.name}</div>
              <div
                className={`text-sm font-semibold ${
                  g.balanceAmount < 0 ? 'text-red-700' : g.balanceAmount > 0 ? 'text-green-700' : 'text-gray-500'
                }`}
              >
                {g.balanceAmount === 0 ? 'All settled ✓' : g.balanceLabel}
              </div>
              {g.balanceAmount < 0 && g.counterparty && <div className="text-xs text-gray-400">to {g.counterparty}</div>}
              {g.balanceAmount > 0 && g.counterparty && <div className="text-xs text-gray-400">from {g.counterparty}</div>}
            </div>
          ))}
        </div>
      </div>

      <AddTransactionModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={loadTransactions}
        />
    </Layout>
  )
}

function Card({
  label,
  value,
  sub,
  valueClass = 'text-gray-900',
}: {
  label: string
  value: string
  sub: string
  valueClass?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}
