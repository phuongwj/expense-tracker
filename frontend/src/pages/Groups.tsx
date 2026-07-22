import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { groups } from '../data/mockData'

export default function Groups() {
  const navigate = useNavigate()
  const totalOwe = groups.filter((g) => g.balanceAmount < 0).reduce((s, g) => s + Math.abs(g.balanceAmount), 0)
  const totalOwed = groups.filter((g) => g.balanceAmount > 0).reduce((s, g) => s + g.balanceAmount, 0)

  return (
    <Layout
      title="My Groups"
      headerActions={
        <>
          <button className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700">
            🔗 Join by link
          </button>
          <button className="h-9 px-4 rounded-lg bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]">
            + Create Group
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-500 mb-6">
        {groups.length} groups · You owe <span className="font-semibold text-red-700">${totalOwe.toFixed(2)}</span> ·
        You're owed <span className="font-semibold text-green-700">${totalOwed.toFixed(2)}</span>
      </p>

      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div
            key={g.id}
            onClick={() => navigate(`/groups/${g.id}`)}
            className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-sm transition"
          >
            <div className="flex items-center gap-2 text-lg mb-1">{g.icon}</div>
            <div className="font-semibold text-gray-900">{g.name}</div>
            <div className="text-xs text-gray-400 mb-3">
              {g.members.length} members · {g.transactionCount} transactions · Last active {g.lastActive}
            </div>
            <div className="flex -space-x-2 mb-3">
              {g.members.map((m) => (
                <div
                  key={m.id}
                  style={{ backgroundColor: m.color }}
                  className="w-7 h-7 rounded-full border-2 border-white text-white text-[10px] font-semibold flex items-center justify-center"
                >
                  {m.initials}
                </div>
              ))}
            </div>
            <div
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                g.balanceAmount < 0
                  ? 'bg-red-50 text-red-700'
                  : g.balanceAmount > 0
                  ? 'bg-green-50 text-green-700'
                  : 'bg-green-50 text-gray-600'
              }`}
            >
              {g.balanceAmount === 0 ? 'All settled ✓' : g.balanceLabel}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
