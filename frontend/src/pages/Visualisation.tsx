import { useState } from 'react'
import Layout from '../components/Layout'

const weekly = [
  { week: 'Week 1', income: 90, expense: 60 },
  { week: 'Week 2', income: 55, expense: 65 },
  { week: 'Week 3', income: 70, expense: 78 },
  { week: 'Week 4', income: 60, expense: 20 },
]

const byCategory = [
  { name: 'Housing', pct: 38 },
  { name: 'Food', pct: 15 },
  { name: 'Education', pct: 10 },
  { name: 'Entertain', pct: 11 },
  { name: 'Other', pct: 26 },
]

const ranges = ['Week', 'Month', 'Semester'] as const

export default function Visualisation() {
  const [range, setRange] = useState<(typeof ranges)[number]>('Month')

  return (
    <Layout
      title="Spending Visualisation"
      headerActions={
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`h-9 px-4 text-sm font-medium ${
                range === r ? 'bg-[#3D6B4F] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      }
    >
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900">Income vs Expenses — May 2026</h2>
        <p className="text-xs text-gray-400 mb-6">Weekly breakdown · Personal view</p>
        <div className="flex items-end gap-6 h-48">
          {weekly.map((w) => (
            <div key={w.week} className="flex flex-col items-center gap-1">
              <div className="flex items-end gap-1 h-40">
                <div className="w-8 bg-[#2D5240] rounded-t" style={{ height: `${w.income}%` }} />
                <div className="w-8 bg-[#C0554F] rounded-t" style={{ height: `${w.expense}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-1">{w.week}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900">Expenses by Category</h2>
        <p className="text-xs text-gray-400 mb-4">May 2026 · $557.50 total</p>
        <div className="flex flex-col gap-3">
          {byCategory.map((c) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#3D6B4F]" />
              <span className="flex-1 text-sm text-gray-700">{c.name}</span>
              <div className="w-40 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-[#3D6B4F]" style={{ width: `${c.pct}%` }} />
              </div>
              <span className="w-10 text-right text-sm font-semibold text-gray-900">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Avg. daily spend" value="$17.98" sub="Based on 31 days" />
        <Stat label="Biggest expense" value="Rent $900" sub="38% of total expenses" />
        <Stat label="Savings rate" value="76.8%" sub="Above student avg (55%)" />
      </div>
    </Layout>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}
