import Spinner from './Spinner'

export interface ToastItem {
  id: string
  message: string
}

export default function Toast({ message }: ToastItem) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 shadow-md"
    >
      <Spinner className="w-4 h-4 border-blue-200 border-t-blue-600" />
      <span>{message}</span>
    </div>
  )
}
