import { useState } from 'react'
import Modal from './Modal'
import { createSettlement } from '../services/transactions'
import { SUPPORT_EMAIL, getErrorMessage } from '../utils/errors'

export default function SettleBalancesModal({
  open,
  onClose,
  onSettled,
  groupId,
  repayingUserId,
  repayingUserName,
  amount,
}: {
  open: boolean
  onClose: () => void
  onSettled: () => void
  groupId: string
  repayingUserId: string
  repayingUserName: string
  amount: number
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setSaving(true)
    setError(null)
    try {
      await createSettlement(groupId, { repayingUserId, amount })
      onSettled()
      onClose()
    } catch (err: any) {
      setError(getErrorMessage(err, `Failed to record settlement. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Settle up">
      {error && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}
      <p className="text-sm text-gray-700 mb-4">
        Mark that <span className="font-semibold">{repayingUserName}</span> paid you back in full.
      </p>
      <div className="bg-green-50 text-green-800 rounded-xl px-4 py-3 mb-4 text-sm font-semibold">
        Amount: ${amount.toFixed(2)}
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Only full settlements are supported — this will clear the entire balance between you and {repayingUserName} in this group.
      </p>

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="flex-1 h-11 rounded-xl bg-[#3D6B4F] text-white text-sm font-semibold hover:bg-[#2D5240] disabled:opacity-50"
        >
          {saving ? 'Recording…' : 'Confirm payment received'}
        </button>
      </div>
    </Modal>
  )
}