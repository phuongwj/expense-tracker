import { useEffect, useState, type ReactNode } from 'react'
import Toast, { type ToastItem } from '../components/Toast'
import { registerToastHandlers, type ToastKind } from '../services/toastBridge'

const MESSAGES: Record<ToastKind, string> = {
  'backend-cold': "Connecting to our server — this can take a moment if it's been idle.",
  'ai-cold': 'Warming up our AI service — this can take up to a minute the first time.',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    registerToastHandlers(
      (kind, id) => {
        setToasts((current) => [...current, { id, message: MESSAGES[kind] }])
      },
      (id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }
    )
  }, [])

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </>
  )
}
