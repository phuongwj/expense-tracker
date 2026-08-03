import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { createPersonalTransaction } from '../services/transactions'
import { getCategories, type Category } from "../services/categories"
import { getErrorMessage, SUPPORT_EMAIL } from '../utils/errors'

export default function AddTransactionModal({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  
  const [kind, setKind] = useState<'Expense' | 'Income'>('Expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [recurring, setRecurring] = useState(false)
  const [repeats, setRepeats] = useState('Monthly')
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const amountRef = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const fieldRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    amount: amountRef,
    date: dateRef,
    description: descriptionRef,
  }

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories()
        setCategories(data)
      } catch (err) {
        console.error("Failed to load categories:", err)
      }
    }

    loadCategories()
  }, [])

  const handleClose = () => {
    setFormError(null)
    setFieldErrors({})
    setKind('Expense')
    setAmount('')
    setDate(new Date().toISOString().slice(0, 10))
    setDescription('')
    setCategoryId(null)
    setRecurring(false)
    setRepeats('Monthly')
    onClose()
  }

  //client side validations before saving the transaction
  const handleSave = async () => {
    setFormError(null)

    const numericAmount = Number(amount)
    const errors: Record<string, string> = {}

    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      errors.amount = 'Please enter a valid amount greater than zero.'
    }
    if (!date) {
      errors.date = 'Please select a date.'
    }
    if (!description.trim()) {
      errors.description = 'Please enter a description.'
    }

    setFieldErrors(errors)

    const firstInvalidField = ['amount', 'date', 'description'].find((f) => errors[f])
    if (firstInvalidField) {
      fieldRefs[firstInvalidField].current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    try {
      await createPersonalTransaction({
        type: kind === 'Expense' ? 'expense' : 'income',
        amount: numericAmount,
        categoryId,
        transactionDate: date,
        description: description || null,
        isRecurring: recurring,
        recurringInterval: recurring
          ? repeats.toLowerCase() as 'weekly' | 'monthly' | 'yearly'
          : null,
      });

      onCreated();
      handleClose();
    } catch (err) {
      setFormError(getErrorMessage(err, `An unexpected server error occured. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`))
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add transaction">
      <p className="text-xs text-gray-400 mb-5">
        Fields marked <span className="text-red-500">*</span> are required.
      </p>

      {formError && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          ⚠ {formError}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2 mb-5" role="group" aria-label="Transaction kind">
        <button
          type="button"
          onClick={() => setKind('Expense')}
          className={`h-10 rounded-xl text-sm font-semibold border transition ${
            kind === 'Expense' ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500'
          }`}
        >
          ▾ Expense
        </button>
        <button
          type="button"
          onClick={() => setKind('Income')}
          className={`h-10 rounded-xl text-sm font-semibold border transition ${
            kind === 'Income' ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-500'
          }`}
        >
          ▴ Income
        </button>
      </div>

      <Field label="Amount *" htmlFor="tx-amount" error={fieldErrors.amount} fieldRef={amountRef}>
        <input
          id="tx-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className={`input ${fieldErrors.amount ? 'error' : ''}`}
        />
      </Field>
      <Field label="Date *" htmlFor="tx-date" error={fieldErrors.date} fieldRef={dateRef}>
        <input
          id="tx-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`input ${fieldErrors.date ? 'error' : ''}`}
        />
      </Field>
      <Field label="Description *" htmlFor="tx-description" error={fieldErrors.description} fieldRef={descriptionRef}>
        <input
          id="tx-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Superstore groceries"
          className={`input ${fieldErrors.description ? 'error' : ''}`}
        />
      </Field>

      <div className="mb-4">
        <label className="label" id="tx-category-label">Category</label>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="tx-category-label">
          {categories.length === 0 && (
            <p className="text-sm text-gray-400">
              No categories available.
            </p>
          )}

          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`px-3 py-2 rounded-xl border text-sm flex flex-col items-center gap-1 min-w-[64px] ${
                categoryId === c.id ? 'border-[#3D6B4F] bg-[#EDF4EE] text-[#2D5240]' : 'border-gray-200 text-gray-600'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-1">
        <div>
          <label htmlFor="tx-recurring" className="text-sm font-medium text-gray-900">Recurring transaction</label>
          <div className="text-xs text-gray-400">Auto-adds on a schedule — e.g. rent, subscriptions</div>
        </div>
        <button
          id="tx-recurring"
          type="button"
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
        <Field label="Repeats" htmlFor="tx-repeats">
          <select id="tx-repeats" value={repeats} onChange={(e) => setRepeats(e.target.value)} className="input">
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Yearly</option>
          </select>
        </Field>
      )}

      <div className="flex gap-3 mt-6">
        <button onClick={handleClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={handleSave} className="flex-1 h-11 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240]">
          Save transaction
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
