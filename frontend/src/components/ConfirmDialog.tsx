export default function ConfirmDialog({
  open,
  title = 'Delete this item?',
  description = "This action can't be undone.",
  confirmLabel = 'Yes, delete',
  onCancel,
  onConfirm,
}: {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6" onClick={onCancel}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7" onClick={(e) => e.stopPropagation()}>
        <div className="w-11 h-11 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xl mb-4">
          ⚠
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-xl bg-red-700 text-white text-sm font-semibold hover:bg-red-800"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
