import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { categories } from '../data/mockData'

const steps = [
  { n: 1, title: 'Upload', sub: 'CSV file of your transactions' },
  { n: 2, title: 'Preview & map fields', sub: 'Confirm amount, date, category' },
  { n: 3, title: 'Import', sub: 'Rows are saved to your account' },
]

function StepBar({ current }: { current: number }) {
  return (
    <div className="bg-[#EDF4EE] rounded-xl p-4 flex flex-wrap gap-6 mb-6">
      {steps.map((s) => (
        <div key={s.n} className="flex items-center gap-3">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${
              s.n <= current ? 'bg-[#2D5240]' : 'bg-gray-300'
            }`}
          >
            {s.n}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{s.title}</div>
            <div className="text-xs text-gray-500">{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface DraftRow {
  id: string
  include: boolean
  description: string
  amount: string
  date: string
  type: 'Expense' | 'Income'
  category: string
  status: 'ok' | 'review'
}

const mockParsedRows: DraftRow[] = [
  { id: 'r1', include: true, description: 'Uber ride - Spring Garden', amount: '18.40', date: 'Apr 30, 2026', type: 'Expense', category: 'Transport', status: 'ok' },
  { id: 'r2', include: true, description: 'Payroll deposit', amount: '620.00', date: 'Apr 30, 2026', type: 'Income', category: 'Income', status: 'ok' },
  { id: 'r3', include: true, description: 'Tim Hortons', amount: '6.85', date: 'May 1, 2026', type: 'Expense', category: 'Food', status: 'ok' },
  { id: 'r4', include: true, description: 'AMZN Mktp CA*3F92J', amount: '42.19', date: 'May 2, 2026', type: 'Expense', category: 'Grocery', status: 'review' },
  { id: 'r5', include: false, description: 'E-transfer received', amount: '50.00', date: 'May 3, 2026', type: 'Income', category: 'Income', status: 'review' },
  { id: 'r6', include: true, description: 'Spotify Premium', amount: '11.49', date: 'May 3, 2026', type: 'Expense', category: 'Entertainment', status: 'ok' },
]

export default function ImportCsv() {
  const navigate = useNavigate()
  const [uploaded, setUploaded] = useState(false)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<DraftRow[]>(mockParsedRows)

  const handleUpload = (name: string) => {
    setFileName(name)
    setUploaded(true)
  }

  const toggleRow = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, include: !r.include } : r)))
  }

  const updateRow = (id: string, field: keyof DraftRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const includedCount = rows.filter((r) => r.include).length
  const reviewCount = rows.filter((r) => r.status === 'review').length

  if (!uploaded) {
    return (
      <Layout title="Import Transactions">
        <div className="text-sm text-gray-400 mb-4">
          <Link to="/transactions" className="hover:underline">
            ← Transactions
          </Link>{' '}
          / <span className="text-gray-700 font-medium">Import CSV</span>
        </div>

        <StepBar current={1} />

        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Upload a CSV file</h2>
          <p className="text-sm text-gray-500 mb-6">
            Export a statement from your bank or spreadsheet as CSV, then upload it here.
            <br />
            We'll match columns to amount, date, description, and category automatically.
          </p>
          <label className="block border-2 border-dashed border-gray-200 rounded-xl py-14 mb-6 cursor-pointer hover:border-[#3D6B4F] transition">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0]?.name ?? 'transactions.csv')}
            />
            <div className="text-3xl mb-2">↑</div>
            <div className="font-semibold text-gray-900">Drag & drop your CSV here</div>
            <div className="text-sm text-gray-400">or click to browse</div>
          </label>
          <button
            onClick={() => handleUpload('transactions_may2026.csv')}
            className="h-11 px-6 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] mb-4"
          >
            Choose file to upload
          </button>
          <div className="text-xs text-gray-400">Supports .csv · Max 5 MB · First row must contain column headers</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Expected columns</h3>
          <p className="text-xs text-gray-500 mb-3">
            Your file should include these fields — column order and exact names don't matter, we'll map them on the
            next step.
          </p>
          <div className="flex flex-wrap gap-2">
            {['date', 'description', 'amount', 'category (optional)', 'type (optional)'].map((c) => (
              <span key={c} className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600">
                {c}
              </span>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      title="Import Transactions"
      headerActions={
        <button
          onClick={() => {
            setUploaded(false)
            setRows(mockParsedRows)
          }}
          className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700"
        >
          ↺ Re-upload
        </button>
      }
    >
      <div className="text-sm text-gray-400 mb-4">
        <button onClick={() => setUploaded(false)} className="hover:underline">
          ← Re-upload
        </button>{' '}
        / <span className="text-gray-700 font-medium">Preview & confirm</span>
      </div>

      <StepBar current={2} />

      <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-900 rounded-xl px-4 py-3 text-sm mb-6">
        <span>
          <span className="font-semibold">✓ Parsed “{fileName}”.</span> {rows.length} rows detected — {reviewCount}{' '}
          flagged for review. Uncheck any rows you don't want to import, and correct anything that looks wrong.
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className={r.include ? '' : 'opacity-40'}>
                <td className="px-4 py-2.5">
                  <input type="checkbox" checked={r.include} onChange={() => toggleRow(r.id)} className="w-4 h-4 accent-[#3D6B4F]" />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    value={r.description}
                    onChange={(e) => updateRow(r.id, 'description', e.target.value)}
                    className={`w-full h-9 rounded-lg border px-2.5 text-sm outline-none ${
                      r.status === 'review' ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                    } focus:border-[#3D6B4F]`}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    value={r.date}
                    onChange={(e) => updateRow(r.id, 'date', e.target.value)}
                    className="w-full h-9 rounded-lg border border-gray-200 px-2.5 text-sm outline-none focus:border-[#3D6B4F]"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    value={r.amount}
                    onChange={(e) => updateRow(r.id, 'amount', e.target.value)}
                    className="w-24 h-9 rounded-lg border border-gray-200 px-2.5 text-sm outline-none focus:border-[#3D6B4F]"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={r.type}
                    onChange={(e) => updateRow(r.id, 'type', e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 px-2 text-sm outline-none focus:border-[#3D6B4F]"
                  >
                    <option>Expense</option>
                    <option>Income</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={r.category}
                    onChange={(e) => updateRow(r.id, 'category', e.target.value)}
                    className="h-9 rounded-lg border border-gray-200 px-2 text-sm outline-none focus:border-[#3D6B4F]"
                  >
                    <option>Income</option>
                    {categories.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                    <option>Entertainment</option>
                  </select>
                </td>
                <td className="px-4 py-2.5 text-gray-400">
                  {r.status === 'review' ? <span title="Needs review">⚠</span> : <span className="text-green-600">✓</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-5">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{includedCount}</span> of {rows.length} rows selected for
          import
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setUploaded(false)}
            className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => navigate('/transactions')}
            disabled={includedCount === 0}
            className="h-11 px-6 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] disabled:opacity-50"
          >
            ✓ Import {includedCount} transaction{includedCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
