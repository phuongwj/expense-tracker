import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { transactions } from '../data/mockData'

const viewOptions = ['Personal', 'Dal Apartment 2B', 'CSCI 4177 Study Group', 'Weekend Trip'] as const
const typeOptions = ['All', 'Expenses', 'Income'] as const

export default function ExportData() {
  const [view, setView] = useState<(typeof viewOptions)[number]>('Personal')
  const [type, setType] = useState<(typeof typeOptions)[number]>('All')
  const [category, setCategory] = useState('All categories')
  const [from, setFrom] = useState('May 1, 2026')
  const [to, setTo] = useState('May 31, 2026')
  const [format, setFormat] = useState<'CSV' | 'PDF'>('CSV')
  const [exported, setExported] = useState(false)

  const filtered = transactions.filter((t) => {
    if (type === 'Expenses') return t.amount < 0
    if (type === 'Income') return t.amount > 0
    return true
  })

  const categories = ['All categories', ...Array.from(new Set(transactions.map((t) => t.category)))]

  if (exported) {
    return (
      <Layout title="Export Transactions">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 text-2xl flex items-center justify-center mx-auto mb-4">
            ✓
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Export ready</h2>
          <p className="text-sm text-gray-500 mb-6">
            {filtered.length} transactions exported as <span className="font-semibold">{format}</span> for{' '}
            <span className="font-semibold">{view}</span>, {from} – {to}.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setExported(false)}
              className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back to filters
            </button>
            <button className="h-11 px-6 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]">
              ↓ Download {format}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Export Transactions">
      <div className="text-sm text-gray-400 mb-4">
        <Link to="/transactions" className="hover:underline">
          ← Transactions
        </Link>{' '}
        / <span className="text-gray-700 font-medium">Export</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Filters</h2>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="View">
            <select value={view} onChange={(e) => setView(e.target.value as typeof view)} className="input">
              {viewOptions.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mb-4">
          <label className="label">Transaction type</label>
          <div className="grid grid-cols-3 gap-2 max-w-sm">
            {typeOptions.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`h-10 rounded-xl text-sm font-medium border ${
                  type === t ? 'bg-[#3D6B4F] text-white border-[#3D6B4F]' : 'border-gray-200 text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="From date">
            <input value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </Field>
          <Field label="To date">
            <input value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </Field>
        </div>

        <div>
          <label className="label">Export format</label>
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <button
              onClick={() => setFormat('CSV')}
              className={`h-10 rounded-xl text-sm font-semibold border ${
                format === 'CSV' ? 'bg-[#EDF4EE] border-[#3D6B4F] text-[#2D5240]' : 'border-gray-200 text-gray-500'
              }`}
            >
              📄 CSV
            </button>
            <button
              onClick={() => setFormat('PDF')}
              className={`h-10 rounded-xl text-sm font-semibold border ${
                format === 'PDF' ? 'bg-[#EDF4EE] border-[#3D6B4F] text-[#2D5240]' : 'border-gray-200 text-gray-500'
              }`}
            >
              🧾 PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Preview</h2>
          <span className="text-sm text-gray-400">{filtered.length} transactions match these filters</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2.5 text-gray-800">
                    {t.icon} {t.description}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{t.category}</td>
                  <td className="px-4 py-2.5 text-gray-600">{t.date}</td>
                  <td className={`px-4 py-2.5 font-semibold ${t.amount < 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {t.amount < 0 ? '−' : '+'}${Math.abs(t.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No transactions match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={() => setExported(true)}
          disabled={filtered.length === 0}
          className="h-11 px-6 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] disabled:opacity-50"
        >
          ↓ Export as {format}
        </button>
      </div>

      <style>{`
        .input { width:100%; height:44px; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0 14px; font-size:0.875rem; outline:none; background:white; }
        .input:focus { border-color:#3D6B4F; }
        .label { display:block; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.03em; margin-bottom:6px; }
      `}</style>
    </Layout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
