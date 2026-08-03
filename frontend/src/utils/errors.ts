export const SUPPORT_EMAIL = 'admin@expense_tracker.com'

const DEFAULT_FALLBACK = `Something went wrong. Please try again, or contact ${SUPPORT_EMAIL} if the problem persists.`

/**
 * Extracts a user-facing error message from a failed API call.
 * Matches the errorHandler middleware: { error: string }
 */
export function getErrorMessage(err: unknown, fallback: string = DEFAULT_FALLBACK): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as any).response
    if (response?.data?.error && typeof response.data.error === 'string') {
      return response.data.error
    }
  }
  return fallback
}