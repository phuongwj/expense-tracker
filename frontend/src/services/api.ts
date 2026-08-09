import axios from 'axios'
import { showColdStartToast, dismissToast } from './toastBridge'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

// Cold-start toast: Render's free instances spin down after 15 min idle and
// take 30-50s+ to wake back up. These flags reset only on a full page
// reload (intentional - that's exactly when a service may have gone cold
// again since the last load).
let hasWarnedBackend = false
let hasWarnedAi = false

const isAiRequest = (url?: string) =>
  !!url && (url.includes('/ai/insights') || url.includes('/ai/extract-receipt'))

// REQUEST interceptor: attaches the JWT token, preserves browser-managed
// multipart headers, and shows a one-shot "waking up" toast for the first
// backend call and the first AI-endpoint call of the session.
api.interceptors.request.use(
  (config) => {
    const headers = config.headers ?? {}

    if (config.data instanceof FormData) {
      delete headers['Content-Type']
    } else if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    config.headers = headers

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    if (isAiRequest(config.url) && !hasWarnedAi) {
      hasWarnedAi = true
      ;(config as typeof config & { _toastId?: string | null })._toastId =
        showColdStartToast('ai-cold')
    } else if (!hasWarnedBackend) {
      hasWarnedBackend = true
      ;(config as typeof config & { _toastId?: string | null })._toastId =
        showColdStartToast('backend-cold')
    }

    return config
  },
  (error) => Promise.reject(error)
)

// try a silent refresh before giving up on 401
let refreshPromise: Promise<string | null> | null = null

// RESPONSE interceptor: if token expires, retry once after refresh before redirecting.
api.interceptors.response.use(
  (response) => {
    dismissToast((response.config as typeof response.config & { _toastId?: string | null })._toastId)
    return response
  },
  async (error) => {
    const original = error.config
    dismissToast(original?._toastId)

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
            .then((res) => {
              const token = res.data.accessToken as string | null
              setAccessToken(token)
              return token
            })
            .finally(() => {
              refreshPromise = null
            })
        }

        const newToken = await refreshPromise
        if (newToken) {
          original.headers = original.headers ?? {}
          original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        }
      } catch {
        setAccessToken(null)
        if (
          !['/login', '/signup', '/forgot-password', '/reset-password'].includes(
            window.location.pathname
          )
        ) {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api
