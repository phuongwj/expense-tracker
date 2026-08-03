import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

// REQUEST interceptor: attaches the JWT token and preserves browser-managed multipart headers.
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

    return config
  },
  (error) => Promise.reject(error)
)

// try a silent refresh before giving up on 401
let refreshPromise: Promise<string | null> | null = null

// RESPONSE interceptor — if token expires, redirect to login automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
            .then((res) => {
              const token = res.data.accessToken
              setAccessToken(token)
              return token
            })
            .finally(() => {
              refreshPromise = null
            })
        }
        const newToken = await refreshPromise
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        }
      } catch {
        setAccessToken(null)
        if (!['/login', '/signup', '/forgot-password', '/reset-password'].includes(window.location.pathname)) {
          window.location.href = '/login' // refresh token itself failed, really logged out
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
