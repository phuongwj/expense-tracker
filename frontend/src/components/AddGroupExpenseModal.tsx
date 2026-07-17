import { useState } from 'react'
import Modal from './Modal'
import type { Group } from '../data/mockData'

export default function AddGroupExpenseModal({
  open,
  onClose,
  group,
}: {
  open: boolean
  onClose: () => void
  group: Group
}) {
  const [split, setSplit] = useState<'equal' | 'custom'>('equal')
  const total = 181.2
  const share = total / group.members.length

  return (
    <Modal open={open} onClose={onClose} title="Add group expense">
      <p className="text-xs text-gray-400 mb-5">
        Fields marked <span className="text-red-500">*</span> are required.
      </p>

      <Field label="Total amount *">
        <input defaultValue={`$${total.toFixed(2)}`} className="input" />
      </Field>
      <Field label="Description *">
        <input placeholder="e.g. Costco groceries" className="input" />
      </Field>
      <Field label="Paid by *">
        <input placeholder="Who paid?" className="input" />
      </Field>
      <Field label="Date *">
        <input placeholder="May 8, 2026" className="input" />
      </Field>

      <div className="mb-4">
        <label className="label">Split method</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSplit('equal')}
            className={`h-10 rounded-xl text-sm font-semibold border ${
              split === 'equal' ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            ⇄ Equal split
          </button>
          <button
            onClick={() => setSplit('custom')}
            className={`h-10 rounded-xl text-sm font-semibold border ${
              split === 'custom' ? 'bg-[#EDF4EE] border-[#3D6B4F] text-[#2D5240]' : 'border-gray-200 text-gray-500'
            }`}
          >
            ✎ Custom amounts
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Member — share</div>
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {group.members
            .filter((m) => m.initials !== '+1')
            .map((m) => (
              <div key={m.id} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-700">{m.name === 'Alex Chen' ? 'Alex Chen (you)' : m.name}</span>
                <span className="font-semibold text-gray-900">${share.toFixed(2)}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-green-50 text-green-800 rounded-xl px-4 py-2.5 mb-6 text-sm font-medium">
        <span>
          Total: ${total.toFixed(2)} / ${total.toFixed(2)}
        </span>
        <span>✓ Balanced</span>
      </div>

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]">
          Save group expense
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
