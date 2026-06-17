import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
  } from 'react'
  import { useNavigate } from 'react-router-dom'
  
  export interface User {
    id: string
    firstName: string
    lastName: string
    email: string
    university: string
  }
  
  export interface AuthContextType {
    user: User | null
    token: string | null
    isLoading: boolean
    login: (token: string, user: User) => void
    logout: () => void
    isAuthenticated: boolean
  }
  
  const AuthContext = createContext<AuthContextType | undefined>(undefined)
  
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser]           = useState<User | null>(null)
    const [token, setToken]         = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const navigate                  = useNavigate()
  
    // On page refresh — restore session from localStorage
    useEffect(() => {
      const storedToken = localStorage.getItem('token')
      const storedUser  = localStorage.getItem('user')
      if (storedToken && storedUser) {
        try {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
      setIsLoading(false)
    }, [])
  
    function login(newToken: string, newUser: User) {
      localStorage.setItem('token', newToken)
      localStorage.setItem('user', JSON.stringify(newUser))
      setToken(newToken)
      setUser(newUser)
    }
  
    function logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
      navigate('/login')
    }
  
    return (
      <AuthContext.Provider value={{
        user, token, isLoading, login, logout,
        isAuthenticated: !!user && !!token,
      }}>
        {children}
      </AuthContext.Provider>
    )
  }
  
  export function useAuth(): AuthContextType {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
    return context
  }
  
  export default AuthContext