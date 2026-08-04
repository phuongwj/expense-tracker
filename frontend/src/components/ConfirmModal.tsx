import Modal from './Modal'

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="h-11 px-6 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">{cancelLabel}</button>
        <button type="button" onClick={onConfirm} className="h-11 px-6 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">{confirmLabel}</button>
      </div>
    </Modal>
  )
}
