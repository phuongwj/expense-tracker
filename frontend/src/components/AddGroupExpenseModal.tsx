import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { createGroupTransaction } from '../services/transactions'
import { useAuth } from '../context/AuthContext'
import type { GroupDetailMember as GroupMember} from '@expense-tracker/shared/groups'
import {SUPPORT_EMAIL, getErrorMessage} from '../utils/errors'

export default function AddGroupExpenseModal({
  open,
  onClose,
  onCreated,
  groupId,
  members,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  groupId: string
  members: GroupMember[]
}) {
  const { user } = useAuth()

  const [split, setSplit] = useState<'equal' | 'custom'>('equal')
  const [totalAmount, setTotalAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paidBy, setPaidBy] = useState<string>(user?.id ?? '')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringInterval, setRecurringInterval] = useState('Monthly')

  const totalRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const paidByRef = useRef<HTMLDivElement>(null)
  const splitRef = useRef<HTMLDivElement>(null)
  const fieldRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    total: totalRef,
    description: descriptionRef,
    paidBy: paidByRef,
    split: splitRef,
  }

  const total = parseFloat(totalAmount) || 0
  const memberCount = members.length
  const equalShare = memberCount > 0 ? total / memberCount : 0

  useEffect(() => {
    if (user?.id) setPaidBy(user.id)
  }, [user])

  // in custom mode, sum up whatever's been entered; in equal mode, the shares always sum to `total` (barring rounding)
  const customTotal = Object.values(customAmounts).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  )
  const splitTotal = split === 'equal' ? equalShare * memberCount : customTotal
  const isBalanced = total > 0 && Math.abs(splitTotal - total) < 0.01

  const handleClose = () => {
    setSplit('equal')
    setTotalAmount('')
    setDescription('')
    setPaidBy(user?.id ?? '')
    setDate(new Date().toISOString().slice(0, 10))
    setCustomAmounts({})
    setFormError(null)
    setFieldErrors({})
    setIsRecurring(false)
    setRecurringInterval('Monthly')
    onClose()
  }

  const handleSave = async () => {
    setFormError(null)

    const errors: Record<string, string> = {}

    if (!total || total <= 0) {
      errors.total = 'Please enter a valid total amount.'
    }
    if (!description.trim()) {
      errors.description = 'Please enter a description.'
    }
    if (!paidBy) {
      errors.paidBy = 'Please select who paid.'
    }

    let splits: { userId: string; amount: number }[]

    if (split === 'equal') {
      splits = members.map((m) => ({ userId: m.userId, amount: equalShare }))
    } else {
      splits = members
        .filter((m) => (parseFloat(customAmounts[m.userId]) || 0) > 0)
        .map((m) => ({ userId: m.userId, amount: parseFloat(customAmounts[m.userId]) }))

      if (!errors.total) {
        if (splits.length === 0) {
          errors.split = 'Please enter at least one custom split amount.'
        } else if (!isBalanced) {
          errors.split = `Splits must add up to the total ($${total.toFixed(2)}). Currently: $${customTotal.toFixed(2)}.`
        }
      }
    }

    setFieldErrors(errors)

    const firstInvalidField = ['total', 'description', 'paidBy', 'split'].find((f) => errors[f])
    if (firstInvalidField) {
      fieldRefs[firstInvalidField].current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSaving(true)
    try {
      await createGroupTransaction(groupId, {
        type: 'expense',
        amount: total,
        transactionDate: date,
        description: description || null,
        paidBy,
        splits,
        isRecurring,
        recurringInterval: isRecurring
          ? recurringInterval.toLowerCase() as 'weekly' | 'monthly' | 'yearly'
          : null,
      })
      onCreated()
      handleClose()
    } catch (err: any) {
      setFormError(getErrorMessage(err, `Failed to create group expense. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add group expense">
      <p className="text-xs text-gray-400 mb-5">
        Fields marked <span className="text-red-500">*</span> are required.
      </p>

      {formError && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          ⚠ {formError}
        </div>
      )}

      <Field label="Total amount *" htmlFor="ge-total" error={fieldErrors.total} fieldRef={totalRef}>
        <input
          id="ge-total"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="0.00"
          className={`input ${fieldErrors.total ? 'error' : ''}`}
        />
      </Field>
      <Field label="Description *" htmlFor="ge-description" error={fieldErrors.description} fieldRef={descriptionRef}>
        <input
          id="ge-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Costco groceries"
          className={`input ${fieldErrors.description ? 'error' : ''}`}
        />
      </Field>
      <Field label="Paid by *" htmlFor="ge-paidby" error={fieldErrors.paidBy} fieldRef={paidByRef}>
        <select
          id="ge-paidby"
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className={`input ${fieldErrors.paidBy ? 'error' : ''}`}
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.firstName} {m.lastName}{m.userId === user?.id ? ' (you)' : ''}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date *" htmlFor="ge-date">
        <input
          id="ge-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
        />
      </Field>

      <div className="mb-4">
        <label className="label" id="ge-split-label">Split method</label>
        <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="ge-split-label">
          <button
            type="button"
            onClick={() => setSplit('equal')}
            className={`h-10 rounded-xl text-sm font-semibold border ${
              split === 'equal' ? 'bg-[#EDF4EE] border-[#3D6B4F] text-[#2D5240]' : 'border-gray-200 text-gray-500'
            }`}
          >
            ⇄ Equal split
          </button>
          <button
            type="button"
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
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Member — {split === 'equal' ? 'share' : 'amount'}
        </div>
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {members.map((m) => (
            <div key={m.userId} className="flex justify-between items-center px-4 py-2.5 text-sm">
              <span className="text-gray-700">
                {m.firstName} {m.lastName}{m.userId === user?.id ? ' (you)' : ''}
              </span>
              {split === 'equal' ? (
                <span className="font-semibold text-gray-900">${equalShare.toFixed(2)}</span>
              ) : (
                <input
                  type="text"
                  value={customAmounts[m.userId] ?? ''}
                  onChange={(e) =>
                    setCustomAmounts((cur) => ({ ...cur, [m.userId]: e.target.value }))
                  }
                  placeholder="0.00"
                  className="w-24 h-8 border border-gray-200 rounded-lg px-2 text-sm text-right outline-none focus:border-[#3D6B4F]"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div ref={splitRef} className="mb-6">
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium ${
            isBalanced ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
          } ${fieldErrors.split ? 'ring-1 ring-red-400' : ''}`}
        >
          <span>
            Total: ${splitTotal.toFixed(2)} / ${total.toFixed(2)}
          </span>
          <span>{isBalanced ? '✓ Balanced' : '⚠ Not balanced'}</span>
        </div>
        {fieldErrors.split && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.split}</p>}
      </div>
      <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-1">
          <div>
              <label htmlFor="ge-recurring" className="text-sm font-medium text-gray-900">Recurring transaction</label>
              <div className="text-xs text-gray-400">Auto-adds on a schedule — e.g. rent, subscriptions</div>
          </div>
          <button
              id="ge-recurring"
              type="button"
              onClick={() => setIsRecurring((r) => !r)}
              className={`w-11 h-6 rounded-full transition relative shrink-0 ${isRecurring ? 'bg-[#3D6B4F]' : 'bg-gray-200'}`}
          >
              <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${
                      isRecurring ? 'left-5' : 'left-0.5'
                  }`}
              />
          </button>
      </div>

      {isRecurring && (
          <Field label="Repeats" htmlFor="ge-repeats">
              <select id="ge-repeats" value={recurringInterval} onChange={(e) => setRecurringInterval(e.target.value)} className="input">
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Yearly</option>
              </select>
          </Field>
      )}
      <div className="flex gap-3">
        <button onClick={handleClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save group expense'}
        </button>
      </div>

      <style>{`
        .input { width:100%; height:44px; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0 14px; font-size:0.875rem; outline:none; }
        .input:focus { border-color:#3D6B4F; }
        .input.error { border-color:#ef4444; }
        .label { display:block; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.03em; margin-bottom:6px; }
      `}</style>
    </Modal>
  )
}

function Field({
  label,
  htmlFor,
  children,
  error,
  fieldRef,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
  error?: string
  fieldRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="mb-4" ref={fieldRef}>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}