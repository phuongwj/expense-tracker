import { useEffect, useRef, useState, type ReactNode } from 'react'
import Toast, { type ToastItem, type ToastTone } from '../components/Toast'
import { registerToastHandlers, type ToastKind } from '../services/toastBridge'

// Success toasts linger so a user who looked away still sees that the wait
// ended well. Waking-up toasts have no duration: they are dismissed by the
// interceptor when the request settles, however long that takes.
const SUCCESS_TOAST_MS = 8000

// A warm backend answers in a few hundred milliseconds. Waiting this long
// before showing a waking-up toast means a warm reload never shows one at
// all - and since the toast never appeared, its success toast is suppressed
// too, so the common case is silent.
const LOADING_DELAY_MS = 800

// Once it *has* appeared, it stays up long enough to read even if the
// request settles immediately after - otherwise it flashes past while the
// page is still showing its spinner.
const MIN_VISIBLE_MS: Record<ToastTone, number> = {
  loading: 3000,
  success: 0,
}

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

interface QueuedToast extends ToastItem {
  durationMs?: number
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<QueuedToast | null>(null)
  // The close button needs to reach into the effect's controller.
  const closeRef = useRef<(id: string) => void>(() => {})

  useEffect(() => {
    // One slot, one queue. A toast asked for while another is on screen waits
    // its turn rather than stacking, so the user never sees a yellow "warming
    // up" sitting under a green "you are all set".
    const queue: QueuedToast[] = []
    let current: QueuedToast | null = null
    let revealed = false
    let shownAt = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    function present() {
      clearTimer()
      revealed = false
      current = queue.shift() ?? null

      if (!current) {
        setVisible(null)
        return
      }

      // Loading toasts audition before they appear: if the request settles
      // inside the delay, `retire` drops them having never been seen.
      if (current.tone === 'loading') {
        setVisible(null)
        timer = setTimeout(reveal, LOADING_DELAY_MS)
        return
      }

      reveal()
    }

    function reveal() {
      if (!current) return

      clearTimer()
      revealed = true
      shownAt = Date.now()
      setVisible(current)

      const { id, durationMs } = current
      if (durationMs) {
        timer = setTimeout(() => retire(id), durationMs)
      }
    }

    // Returns whether this toast was ever actually on screen, so the caller
    // can skip a success toast that would have nothing to resolve.
    // `immediate` skips the minimum: an explicit close means the user has
    // read it (or does not care), so honouring the hold would feel broken.
    function retire(id: string, immediate = false): boolean {
      if (!current || current.id !== id) {
        const queued = queue.findIndex((toast) => toast.id === id)
        if (queued !== -1) queue.splice(queued, 1)
        return false
      }

      if (!revealed) {
        present()
        return false
      }

      const held = immediate ? 0 : MIN_VISIBLE_MS[current.tone] - (Date.now() - shownAt)

      clearTimer()

      if (held > 0) {
        timer = setTimeout(present, held)
      } else {
        present()
      }

      return true
    }

    closeRef.current = (id: string) => {
      retire(id, true)
    }

    registerToastHandlers(
      (kind, id) => {
        const { message, tone, durationMs } = TOASTS[kind]
        queue.push({ id, message, tone, durationMs })

        if (!current) {
          present()
          return
        }

        // A finished-and-lingering success toast is stale the moment
        // something new starts: drop it now rather than making the new toast
        // wait out its remaining seconds.
        if (current.tone === 'success') {
          retire(current.id, true)
        }
      },
      (id) => retire(id)
    )

    return clearTimer
  }, [])

  return (
    <>
      {children}
      <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {visible && <Toast {...visible} onDismiss={() => closeRef.current(visible.id)} />}
      </div>
    </>
  )
}
