import api from './api'

// Render's free instances spin down after ~15 min idle, and the AI
// microservice only wakes when something actually hits it. So we ask the
// backend to ping the microservice as early as possible (app load
// / login screen), letting it boot in the background while the user browses.
//
// Fire-and-forget by design: a failed warm-up must never surface an error.
export type AiWarmState = 'cold' | 'warming' | 'warm' | 'unavailable'

// Only `warm` means the microservice has actually answered a health check.
// The old version latched on the backend's 202 - which it returns whether or
// not the ping succeeded - so one silently failed warm-up per page load was
// never retried. Anything short of `warm` leaves this unset so the next call
// site (an AI page mounting) pings again.
//
// A warm reading also expires, matching the backend's own TTL: a tab left
// open longer than Render's idle window is talking to an instance that has
// since spun back down, and must be free to warm it again.
const WARM_TTL_MS = 600000

let warmedAt = 0
let inFlight: Promise<void> | null = null

export function warmUpAiService(): Promise<void> {
  if (warmedAt && Date.now() - warmedAt < WARM_TTL_MS) return Promise.resolve()
  if (inFlight) return inFlight

  inFlight = api
    .post<{ status: AiWarmState }>('/ai/warmup')
    .then((response) => {
      warmedAt = response.data?.status === 'warm' ? Date.now() : 0
    })
    .catch(() => {
      // Leaving warmedAt unset is the retry: the next call site tries again.
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}
