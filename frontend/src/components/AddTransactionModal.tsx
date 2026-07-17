import { useState } from 'react'
import Modal from './Modal'
import { categories } from '../data/mockData'

export default function AddTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [kind, setKind] = useState<'Expense' | 'Income'>('Expense')
  const [category, setCategory] = useState('Grocery')
  const [recurring, setRecurring] = useState(false)

  return (
    <Modal open={open} onClose={onClose} title="Add transaction">
      <p className="text-xs text-gray-400 mb-5">
        Fields marked <span className="text-red-500">*</span> are required.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => setKind('Expense')}
          className={`h-10 rounded-xl text-sm font-semibold border transition ${
            kind === 'Expense' ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500'
          }`}
        >
          ▾ Expense
        </button>
        <button
          onClick={() => setKind('Income')}
          className={`h-10 rounded-xl text-sm font-semibold border transition ${
            kind === 'Income' ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-500'
          }`}
        >
          ▴ Income
        </button>
      </div>

      <Field label="Amount *">
        <input placeholder="$0.00" className="input" />
      </Field>
      <Field label="Date *">
        <input placeholder="May 5, 2026" className="input" />
      </Field>
      <Field label="Description *">
        <input placeholder="e.g. Superstore groceries" className="input" />
      </Field>

      <div className="mb-4">
        <label className="label">Category *</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.name}
              onClick={() => setCategory(c.name)}
              className={`px-3 py-2 rounded-xl border text-sm flex flex-col items-center gap-1 min-w-[64px] ${
                category === c.name ? 'border-[#3D6B4F] bg-[#EDF4EE] text-[#2D5240]' : 'border-gray-200 text-gray-600'
              }`}
            >
              <span>{c.icon}</span>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-1">
        <div>
          <div className="text-sm font-medium text-gray-900">Recurring transaction</div>
          <div className="text-xs text-gray-400">Auto-adds on a schedule — e.g. rent, subscriptions</div>
        </div>
        <button
          onClick={() => setRecurring((r) => !r)}
          className={`w-11 h-6 rounded-full transition relative shrink-0 ${recurring ? 'bg-[#3D6B4F]' : 'bg-gray-200'}`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${
              recurring ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {recurring && (
        <Field label="Repeats">
          <select className="input">
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Yearly</option>
          </select>
        </Field>
      )}

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]">
          Save transaction
        </button>
      </div>

      <style>{`
        .input { width:100%; height:44px; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0 14px; font-size:0.875rem; outline:none; }
        .input:focus { border-color:#3D6B4F; }
        .label { display:block; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.03em; margin-bottom:6px; }
      `}</style>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
