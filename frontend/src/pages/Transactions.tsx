import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import AddTransactionModal from '../components/AddTransactionModal'
import AddGroupExpenseModal from '../components/AddGroupExpenseModal'
import EditTransactionModal from '../components/EditTransactionModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { getPersonalTransactions, deletePersonalTransaction, getGroupTransactions, deleteGroupTransaction, type Transaction } from '../services/transactions'
import { getGroups, getGroup } from '../services/groupService'
import type { GroupSummary, GroupDetailMember } from '@expense-tracker/shared/groups'
import { getErrorMessage, SUPPORT_EMAIL } from '../utils/errors'

const tabs = ['All', 'Expenses', 'Income', 'Recurring'] as const

export default function Transactions() {
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [tab, setTab] = useState<(typeof tabs)[number]>('All')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Transaction[]>([])
  const [view, setView] = useState('personal')
  const [userGroups, setUserGroups] = useState<GroupSummary[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupDetailMember[]>([])
  const [selectedMonth, setSelectedMonth] = useState('all')

  async function loadTransactions() {
    try {
      if (view === 'personal') {
        const data = await getPersonalTransactions()
        setItems(data)
        setGroupMembers([])
      } else {
        const [data, groupDetail] = await Promise.all([
          getGroupTransactions(view),
          getGroup(view),
        ])
        setItems(
          data.map((t: Transaction) => ({ ...t, amount: Number(t.amount) }))
        )
        setGroupMembers(groupDetail.members)
      }
    } catch (err) {
      console.error('Failed to load transactions:', err)
    }
  }

  useEffect(() => {
    setSelectedMonth('all')
    //since group view has no income tab, if switching away from personal then reset tab to default
    if (view !== 'personal') setTab('All')
    loadTransactions()
  }, [view])

  useEffect(() => {
    getGroups().then(setUserGroups).catch(() => setUserGroups([]))
  }, [])

  const filtered = items.filter((t) => {
    if (query && t.description && !t.description.toLowerCase().includes(query.toLowerCase())) return false
    if (selectedMonth !== 'all' && monthKey(t.transactionDate) !== selectedMonth) return false
    if (tab === 'Expenses') return t.type === 'expense'
    if (tab === 'Income') return t.type === 'income'
    if (tab === 'Recurring') return !!t.recurringInterval
    return true
  })

  const income = filtered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expenses = filtered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = income - expenses

  //helper functions to get a 'YYYY-MM' label from a given transaction date 
  function monthKey(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  function monthLabel(key: string) {
    const [year, month] = key.split('-').map(Number)
    return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  //the set of months used for dropdown filter, sorted by most recent first
  const availableMonths = Array.from(
    new Set(items.map((t) => monthKey(t.transactionDate)))
  ).sort((a, b) => (a < b ? 1 : -1))

  const visibleTabs = view === 'personal' ? tabs : tabs.filter((t) => t !== 'Income')

  return (
    <Layout
      title="Transactions"
      headerActions={
        <>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            className="h-9 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-700"
          >
            <option value="personal">📍 Personal View</option>
            {userGroups.map((g) => (
              <option key={g.id} value={g.id}>
                👥 {g.name}
              </option>
            ))}
          </select>
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
      {deleteError && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{deleteError}</div>
      )}
      <div className={`grid grid-cols-1 ${view === 'personal' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 mb-6`}>
        {view === 'personal' && (
          <Card
            label="Balance"
            value={`$${balance.toFixed(2)}`}
          />
        )}
        {view === 'personal' && (
          <Card
            label="Income"
            value={`+$${income.toFixed(2)}`}
            valueClass="text-green-700"
          />
        )}
        <Card
          label={view === 'personal' ? 'Expenses' : 'Total spent'}
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
        {visibleTabs.map((t) => (
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
  <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white text-gray-700"
        >
          <option value="all">📅 All time</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              📅 {monthLabel(m)}
            </option>
          ))}
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
                  {!!t.recurringInterval && (
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

       {view === 'personal' ? (
        <AddTransactionModal
          open={addOpen && !editTransaction}
          onClose={() => setAddOpen(false)}
          onCreated={loadTransactions}
        />
      ) : (
        <AddGroupExpenseModal
          open={addOpen && !editTransaction}
          onClose={() => setAddOpen(false)}
          onCreated={loadTransactions}
          groupId={view}
          members={groupMembers}
        />
      )}

        <EditTransactionModal
          transaction={editTransaction}
          open={!!editTransaction && !addOpen}
          onClose={() => setEditTransaction(null)}
          onUpdated={loadTransactions}
          groupId={view !== 'personal' ? view : undefined}
        />

        <ConfirmDialog
          open={!!deleteId}
          onCancel={() => setDeleteId(null)}
          onConfirm={async () => {
            if (!deleteId) return

            try {
              if (view === 'personal') {
                await deletePersonalTransaction(deleteId)
              } else {
                await deleteGroupTransaction(view, deleteId)
              }

              setItems((prev) => prev.filter((t) => t.id !== deleteId))
            } catch (err) {
              setDeleteError(getErrorMessage(err, `Unable to delete this transaction. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`))
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
