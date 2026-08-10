import Spinner from './Spinner'

export type ToastTone = 'loading' | 'success'

export interface ToastItem {
  id: string
  message: string
  tone: ToastTone
}

const toneStyles: Record<ToastTone, string> = {
  loading: 'border-yellow-300 bg-yellow-100 text-yellow-900',
  success: 'border-green-300 bg-green-100 text-green-900',
}

export default function Toast({ message, tone }: ToastItem) {
  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-md ${toneStyles[tone]}`}
    >
      {tone === 'loading' ? (
        <Spinner className="w-4 h-4 border-yellow-300 border-t-yellow-500" />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white"
        >
          ✓
        </span>
      )}
      <span>{message}</span>
    </div>
  )
}
