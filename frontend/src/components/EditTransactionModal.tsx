import { useEffect, useState } from 'react'
import Modal from './Modal'
import { updatePersonalTransaction, type Transaction } from '../services/transactions'

interface EditTransactionModalProps {
  open: boolean
  onClose: () => void
  onUpdated: () => void
  transaction: Transaction | null
}

export default function EditTransactionModal({
  open,
  onClose,
  onUpdated,
  transaction,
}: EditTransactionModalProps) {
  const [kind, setKind] = useState<'Expense' | 'Income'>('Expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [repeats, setRepeats] = useState<
    'weekly' | 'monthly' | 'yearly'
  >('monthly')

  useEffect(() => {
    if (!transaction) return

    setKind(transaction.type === 'expense' ? 'Expense' : 'Income')
    setAmount(String(transaction.amount))
    setDate(transaction.transactionDate.slice(0, 10))
    setDescription(transaction.description ?? '')
    setRecurring(transaction.isRecurring)

    if (transaction.recurringInterval === 'weekly' ||
        transaction.recurringInterval === 'monthly' ||
        transaction.recurringInterval === 'yearly') {
      setRepeats(transaction.recurringInterval)
    }
  }, [transaction])


  const handleSave = async () => {
    if (!transaction) return

    try {
      await updatePersonalTransaction(transaction.id, {
        type: kind === 'Expense' ? 'expense' : 'income',
        amount: Number(amount),
        transactionDate: date,
        description: description || null,
        isRecurring: recurring,
        recurringInterval: recurring ? repeats : null,
        categoryId: transaction.categoryId,
      })

      onUpdated()
      onClose()
    } catch (err) {
      console.error("Failed to update transaction:", err)
    }
  }


  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit transaction"
    >
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          type="button"
          onClick={() => setKind('Expense')}
          className={`h-10 rounded-xl border text-sm font-semibold ${
            kind === 'Expense'
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'border-gray-200 text-gray-500'
          }`}
        >
          ▾ Expense
        </button>

        <button
          type="button"
          onClick={() => setKind('Income')}
          className={`h-10 rounded-xl border text-sm font-semibold ${
            kind === 'Income'
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'border-gray-200 text-gray-500'
          }`}
        >
          ▴ Income
        </button>
      </div>


      <Field label="Amount">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input"
        />
      </Field>


      <Field label="Date">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
        />
      </Field>


      <Field label="Description">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </Field>


      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <label className="text-sm font-medium">
          Recurring transaction
        </label>

        <button
          type="button"
          onClick={() => setRecurring((r) => !r)}
          className={`w-11 h-6 rounded-full ${
            recurring ? 'bg-[#3D6B4F]' : 'bg-gray-200'
          }`}
        >
          <span
            className={`block w-5 h-5 bg-white rounded-full transition ${
              recurring ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>


      {recurring && (
        <Field label="Repeats">
          <select
            value={repeats}
            onChange={(e) =>
              setRepeats(
                e.target.value as 'weekly' | 'monthly' | 'yearly'
              )
            }
            className="input"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
      )}


      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="flex-1 h-11 rounded-xl border border-gray-200"
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          className="flex-1 h-11 rounded-xl bg-[#3D6B4F] text-white font-semibold"
        >
          Update transaction
        </button>
      </div>


      <style>{`
        .input {
          width: 100%;
          height: 44px;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0 14px;
          font-size: 0.875rem;
        }
      `}</style>
    </Modal>
  )
}


function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <label className="label">
        {label}
      </label>
      {children}
    </div>
  )
}