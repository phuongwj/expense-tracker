import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()
  return (
    <div style={{padding:'40px', fontFamily:'sans-serif'}}>
      <h1>✅ It works! Welcome {user?.firstName}</h1>
      <button onClick={logout}>Sign out</button>
    </div>
  )
}