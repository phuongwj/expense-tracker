import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

const navMain = [
  { to: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { to: '/transactions', label: 'Transactions', icon: '≡', badge: 'T' },
  { to: '/visualisation', label: 'Visualisation', icon: '📊' },
]

const navGroups = [{ to: '/groups', label: 'My Groups', icon: '👥' }]

const navTools = [
  { to: '/smart-scan', label: 'Smart Scan', icon: '⌗' },
  { to: '/ai-insights', label: 'AI Insights', icon: '✦' },
  { to: '/help', label: 'Help & Support', icon: '?' },
]

function NavSection({ title, items }: { title: string; items: typeof navMain }) {
  return (
    <div className="mb-6">
      <div className="px-3 mb-2 text-[10px] font-semibold tracking-widest text-white/40 uppercase">{title}</div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="flex items-center gap-2.5">
              <span className="w-4 text-center opacity-80">{item.icon}</span>
              {item.label}
            </span>
            {item.badge && (
              <span className="text-[10px] border border-white/20 rounded px-1 text-white/50">{item.badge}</span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default function Layout({
  title,
  headerActions,
  children,
}: {
  title: string
  headerActions?: ReactNode
  children: ReactNode
}) {
  const { user } = useAuth()
  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}` : 'AC'
  const name = user ? `${user.firstName} ${user.lastName}` : 'Alex Chen'

  return (
    <div className="min-h-screen flex bg-[#F2F0EA]">
      <aside className="w-60 shrink-0 bg-[#2D5240] flex flex-col p-4">
        <div className="px-2 py-3 mb-4 text-lg font-serif">
          <span className="text-white">Expense</span>
          <span className="text-[#8FBF9F]">Tracker</span>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <NavSection title="Main" items={navMain} />
          <NavSection title="Groups" items={navGroups} />
          <NavSection title="Tools" items={navTools} />
        </nav>
        <NavLink to="/settings" className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-white/5 transition">
          <div className="w-8 h-8 rounded-full bg-[#8FBF9F] text-[#2D5240] font-semibold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white font-medium truncate">{name}</div>
            <div className="text-xs text-white/50 truncate">{user?.email ?? 'alex.chen@dal.ca'}</div>
          </div>
        </NavLink>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-8 py-6 border-b border-black/5">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <div className="flex items-center gap-3">{headerActions}</div>
        </header>
        <div className="flex-1 px-8 py-6 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
