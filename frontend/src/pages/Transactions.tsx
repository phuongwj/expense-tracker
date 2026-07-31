import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import AddTransactionModal from '../components/AddTransactionModal'
import EditTransactionModal from '../components/EditTransactionModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { getPersonalTransactions, deletePersonalTransaction, type Transaction} from '../services/transactions'

const tabs = ['All', 'Expenses', 'Income', 'Recurring'] as const

export default function Transactions() {
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [tab, setTab] = useState<(typeof tabs)[number]>('All')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Transaction[]>([])
  

  async function loadTransactions() {
    try {
      const data = await getPersonalTransactions()
      setItems(data)
    } catch (err) {
      console.error("Failed to load transactions:", err)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  const filtered = items.filter((t) => {
    if (query && t.description && !t.description.toLowerCase().includes(query.toLowerCase())) return false
    if (tab === 'Expenses') return t.type === 'expense'
    if (tab === 'Income') return t.type === 'income'
    if (tab === 'Recurring') return t.isRecurring
    return true
  })

  const income = items
  .filter((t) => t.type === 'income')
  .reduce((sum, t) => sum + Number(t.amount), 0)

  const expenses = items
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = income - expenses

  return (
    <Layout
      title="Transactions"
      headerActions={
        <>
          <button
            onClick={() => navigate('/import-csv')}
            className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700"
          >
            ↑ Import CSV
          </button>
          <button
            onClick={() => navigate('/export')}
            className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700"
          >
            ↓ Export CSV
          </button>
          <button
            onClick={() => {
              setEditTransaction(null)
              setAddOpen(true)
            }}
            className="h-9 px-4 rounded-lg bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]"
          >
            + Add Transaction
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card
          label="Balance"
          value={`$${balance.toFixed(2)}`}
            />

        <Card
          label="Income"
          value={`+$${income.toFixed(2)}`}
          valueClass="text-green-700"
        />

        <Card
          label="Expenses"
          value={`−$${expenses.toFixed(2)}`}
          valueClass="text-red-700"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[220px] relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions..."
            className="w-full h-10 border border-gray-200 rounded-lg pl-9 pr-3 text-sm bg-white outline-none focus:border-[#3D6B4F]"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        </div>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-10 px-4 rounded-lg text-sm font-medium border ${
              tab === t ? 'bg-[#3D6B4F] text-white border-[#3D6B4F]' : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
        <select className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-700">
          <option>📅 May 2026</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((t) => (
              <tr key={t.id}>
                <td className="px-6 py-3 font-medium text-gray-900">
                  {t.description}
                  {t.isRecurring && (
                    <span className="ml-2 text-[10px] font-semibold bg-green-50 text-green-700 rounded px-1.5 py-0.5">
                      ↻ Recurring
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-gray-600">{t.category || ""}</td>
                <td className="px-6 py-3 text-gray-600">{new Date(t.transactionDate).toLocaleDateString()}</td>
                <td
                  className={`px-6 py-3 font-semibold ${
                    t.type === 'expense' ? 'text-red-700' : 'text-green-700'
                  }`}
                >
                  {t.type === 'expense' ? '−' : '+'}${Number(t.amount).toFixed(2)}
                </td>
                <td className="px-6 py-3 text-gray-600">{t.type}</td>
                <td className="px-6 py-3 text-gray-400">
                  <button
                    id='editTransactionButton'
                    onClick={() => {
                      setAddOpen(false)
                      setEditTransaction(t)
                    }}
                    className="mr-3 hover:text-gray-700"
                  > 
                    ✎
                  </button>
                  <button 
                    id='deleteTransactionButton' 
                    onClick={() => setDeleteId(t.id)} 
                    className="hover:text-red-600"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

       <AddTransactionModal
          open={addOpen && !editTransaction}
          onClose={() => setAddOpen(false)}
          onCreated={loadTransactions}
        />

        <EditTransactionModal
          transaction={editTransaction}
          open={!!editTransaction && !addOpen}
          onClose={() => setEditTransaction(null)}
          onUpdated={loadTransactions}
        />

        <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return

          try {
            await deletePersonalTransaction(deleteId)

            setItems((prev) => prev.filter((t) => t.id !== deleteId))
          } catch (err) {
            console.error("Failed to delete transaction:", err)
          } finally {
            setDeleteId(null)
          }
        }}
      />
    </Layout>
  )
}

function Card({ label, value, valueClass = 'text-gray-900' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
    </div>
  )
}
