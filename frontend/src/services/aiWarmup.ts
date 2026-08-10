import api from './api'

// Render's free instances spin down after ~15 min idle, and the AI
// microservice only wakes when something actually hits it. So we ask the 
// backend to ping the microservice as early as possible (app load 
// / login screen), letting it boot in the background while the user browses.
//
// Fire-and-forget by design: a failed warm-up must never surface an error.
let warmUpStarted = false

export function warmUpAiService() {
  if (warmUpStarted) return
  warmUpStarted = true

  api.post('/ai/warmup').catch(() => {
    // Retry once on the next call site (e.g. when the AI page mounts).
    warmUpStarted = false
  })
}
