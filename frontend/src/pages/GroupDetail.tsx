import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import AddGroupExpenseModal from '../components/AddGroupExpenseModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { groups, groupExpenses } from '../data/mockData'

export default function GroupDetail() {
  const { id } = useParams()
  const [addOpen, setAddOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const group = groups.find((g) => g.id === id)
  const expenses = id ? groupExpenses[id] ?? [] : []

  if (!group) return <Navigate to="/groups" replace />

  return (
    <Layout
      title={group.name}
      headerActions={
        <>
          <button className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">
            ⚙ Manage Group
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="h-9 px-4 rounded-lg bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]"
          >
            + Add Expense
          </button>
        </>
      }
    >
      <div className="text-sm text-gray-400 mb-4">
        <Link to="/groups" className="hover:underline">
          ← My Groups
        </Link>{' '}
        / <span className="text-gray-700 font-medium">{group.icon} {group.name}</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Group expenses ({expenses.length})</h2>
          <button onClick={() => setAddOpen(true)} className="text-sm text-[#3D6B4F] font-medium hover:underline">
            + Add expense
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg">{e.icon}</div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {e.description}
                    {e.recurring && (
                      <span className="ml-2 text-[10px] font-semibold bg-green-50 text-green-700 rounded px-1.5 py-0.5">
                        ↻ Recurring
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    Paid by {e.paidBy} · {e.date} · Split equally
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">${e.total.toFixed(2)}</div>
                <div className="text-xs text-gray-400">{e.shareLabel}</div>
                {removeId !== e.id && (
                  <button
                    onClick={() => setRemoveId(e.id)}
                    className="text-xs text-red-600 font-medium hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Outstanding balances</h2>
        <div className="divide-y divide-gray-100">
          {group.members
            .filter((m) => m.name !== 'Alex Chen' && m.initials !== '+1')
            .map((m, i) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: m.color }}
                    className="w-8 h-8 rounded-full text-white text-xs font-semibold flex items-center justify-center"
                  >
                    {m.initials}
                  </div>
                  <span className="text-sm text-gray-800">{m.name}</span>
                </div>
                <span className={`text-sm font-semibold ${i === 0 ? 'text-red-700' : i === 1 ? 'text-green-700' : 'text-gray-400'}`}>
                  {i === 0 ? `You owe $${Math.abs(group.balanceAmount).toFixed(2)}` : i === 1 ? 'Owes you $22.10' : 'Settled ✓'}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Members ({group.members.length})</h2>
        <div className="divide-y divide-gray-100">
          {group.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div
                  style={{ backgroundColor: m.color }}
                  className="w-8 h-8 rounded-full text-white text-xs font-semibold flex items-center justify-center"
                >
                  {m.initials}
                </div>
                <span className="text-sm text-gray-800">{m.name}</span>
              </div>
              <span className="text-xs text-gray-400">{m.role ? `You · ${m.role}` : 'Member'}</span>
            </div>
          ))}
        </div>
      </div>

      <AddGroupExpenseModal open={addOpen} onClose={() => setAddOpen(false)} group={group} />
      <ConfirmDialog open={!!removeId} onCancel={() => setRemoveId(null)} onConfirm={() => setRemoveId(null)} />
    </Layout>
  )
}
