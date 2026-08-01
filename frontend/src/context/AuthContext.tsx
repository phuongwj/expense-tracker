import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
  } from 'react'
import * as authService from '../services/authService'
import type { PublicUser } from '@expense-tracker/shared/auth'

  
type AuthContextValue = {
  user: PublicUser | null
  isLoading: boolean
  login: (user: PublicUser) => void
  logout: () => Promise<void>
}
  
const AuthContext = createContext<AuthContextValue | undefined>(undefined)
  
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, try to silently restore the session using the refresh cookie.
  // getMe() will 401 (no access token in memory yet), the api.ts response
  // interceptor will attempt /auth/refresh, and if the refresh cookie is
  // still valid, getMe() succeeds transparently on retry.
  useEffect(() => {
    authService
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = (loggedInUser: PublicUser) => {
    setUser(loggedInUser)
  }

  const logout = async () => {
    try {
      await authService.logOut()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  } 
  return ctx
}

export default AuthContext