import { useEffect, useRef, useState, type ReactNode } from 'react'
import Toast, { type ToastItem, type ToastTone } from '../components/Toast'
import { registerToastHandlers, type ToastKind } from '../services/toastBridge'

// Success toasts linger so a user who looked away still sees that the wait
// ended well. Waking-up toasts have no duration: they are dismissed by the
// interceptor when the request settles, however long that takes.
const SUCCESS_TOAST_MS = 8000

const TOASTS: Record<ToastKind, { message: string; tone: ToastTone; durationMs?: number }> = {
  'backend-cold': {
    message: "Connecting to our server. This can take a moment if it's been idle.",
    tone: 'loading',
  },
  'ai-cold': {
    message: 'Warming up our AI service. This can take up to a minute the first time.',
    tone: 'loading',
  },
  'backend-ready': {
    message: 'Connected to our server. You are all set.',
    tone: 'success',
    durationMs: SUCCESS_TOAST_MS,
  },
  'ai-ready': {
    message: 'AI service is up and running. Thanks for waiting.',
    tone: 'success',
    durationMs: SUCCESS_TOAST_MS,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const timersOnMount = timers.current

    const remove = (id: string) => {
      const timer = timersOnMount.get(id)
      if (timer) {
        clearTimeout(timer)
        timersOnMount.delete(id)
      }

      setToasts((current) => current.filter((toast) => toast.id !== id))
    }

    registerToastHandlers((kind, id) => {
      const { message, tone, durationMs } = TOASTS[kind]

      setToasts((current) => [...current, { id, message, tone }])

      if (durationMs) {
        timersOnMount.set(
          id,
          setTimeout(() => remove(id), durationMs)
        )
      }
    }, remove)

    return () => {
      timersOnMount.forEach(clearTimeout)
      timersOnMount.clear()
    }
  }, [])

  return (
    <>
      {children}
      <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </>
  )
}
