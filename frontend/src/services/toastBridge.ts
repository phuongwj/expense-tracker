// Bridge between the axios interceptors in `api.ts` (plain JS, outside the
// React tree) and the ToastProvider (React state). api.ts never imports
// React directly; it just calls these functions, which are no-ops until
// ToastProvider registers itself on mount.

export type ToastKind = 'backend-cold' | 'ai-cold' | 'backend-ready' | 'ai-ready'

// The success toast that replaces each waking-up toast once the service
// answers, so the spinner resolves into an explicit "it worked" instead of
// just disappearing.
export const READY_TOAST_FOR: Record<'backend-cold' | 'ai-cold', ToastKind> = {
  'backend-cold': 'backend-ready',
  'ai-cold': 'ai-ready',
}

type ShowHandler = (kind: ToastKind, id: string) => void
// Returns whether the toast had actually become visible.
type DismissHandler = (id: string) => boolean

let showHandler: ShowHandler | null = null
let dismissHandler: DismissHandler | null = null

export function registerToastHandlers(show: ShowHandler, dismiss: DismissHandler) {
  showHandler = show
  dismissHandler = dismiss
}

export function showToast(kind: ToastKind): string | null {
  if (!showHandler) return null

  const id = crypto.randomUUID()
  showHandler(kind, id)
  return id
}

// True only if the toast was on screen, so callers can tell a real wait from
// one that resolved before anything was ever shown.
export function dismissToast(id: string | null | undefined): boolean {
  if (!id) return false
  return dismissHandler?.(id) ?? false
}
