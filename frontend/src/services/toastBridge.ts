// Bridge between the axios interceptors in `api.ts` (plain JS, outside the
// React tree) and the ToastProvider (React state). api.ts never imports
// React directly; it just calls these functions, which are no-ops until
// ToastProvider registers itself on mount.

export type ToastKind = 'backend-cold' | 'ai-cold'

type ShowHandler = (kind: ToastKind, id: string) => void
type DismissHandler = (id: string) => void

let showHandler: ShowHandler | null = null
let dismissHandler: DismissHandler | null = null

export function registerToastHandlers(show: ShowHandler, dismiss: DismissHandler) {
  showHandler = show
  dismissHandler = dismiss
}

export function showColdStartToast(kind: ToastKind): string | null {
  if (!showHandler) return null

  const id = crypto.randomUUID()
  showHandler(kind, id)
  return id
}

export function dismissToast(id: string | null | undefined) {
  if (id) dismissHandler?.(id)
}
