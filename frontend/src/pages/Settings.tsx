import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user, logout } = useAuth()
  const [push, setPush] = useState(true)
  const [email, setEmail] = useState(true)
  const [aiSuggestions, setAiSuggestions] = useState(false)
  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}` : 'AC'
  const name = user ? `${user.firstName} ${user.lastName}` : 'Alex Chen'

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`w-11 h-6 rounded-full relative transition ${on ? 'bg-[#3D6B4F]' : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${on ? 'left-5' : 'left-0.5'}`} />
    </button>
  )

  return (
    <Layout title="Profile & Settings">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-[#8FBF9F] text-[#2D5240] font-semibold text-xl flex items-center justify-center mb-3">
            {initials}
          </div>
          <div className="font-semibold text-gray-900">{name}</div>
          <div className="text-sm text-gray-400">{user?.email ?? 'alex.chen@dal.ca'}</div>
          <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
            🎓 {user?.university ?? 'Dalhousie University'}
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full h-11 rounded-xl border border-red-200 text-red-700 font-semibold text-sm hover:bg-red-50"
        >
          ⏻ Sign out
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Account information</h2>
        <Row label="Display name">
          <input defaultValue={name} className="input" />
        </Row>
        <Row label="University">
          <input defaultValue={user?.university ?? 'Dalhousie University'} className="input" />
        </Row>
        <Row label="Change password">
          <button className="text-sm text-gray-400">›</button>
        </Row>
        <Row label="Default currency">
          <button className="text-sm text-gray-600 font-medium">CAD $ ›</button>
        </Row>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Notifications & preferences</h2>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-sm text-gray-700">Push notifications</span>
          <Toggle on={push} onClick={() => setPush((v) => !v)} />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-sm text-gray-700">Monthly email summary</span>
          <Toggle on={email} onClick={() => setEmail((v) => !v)} />
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-gray-700">AI spending suggestions</span>
          <Toggle on={aiSuggestions} onClick={() => setAiSuggestions((v) => !v)} />
        </div>
      </div>

      <style>{`
        .input { width:220px; height:38px; border:1px solid #e5e7eb; border-radius:0.65rem; padding:0 12px; font-size:0.875rem; outline:none; text-align:right; }
        .input:focus { border-color:#3D6B4F; }
      `}</style>
    </Layout>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      {children}
    </div>
  )
}
