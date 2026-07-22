export default function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block ${className} border-2 border-white/40 border-t-white rounded-full animate-spin`}
      aria-hidden="true"
    />
  )
}

/**
 * Simulates an async backend call (e.g. saving a transaction, exporting a file).
 * Swap this out for a real `await api.post(...)` once the backend endpoint exists —
 * everything that calls this (loading state, disabled button, spinner) stays the same.
 */
export function simulateApiCall(ms = 900): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
