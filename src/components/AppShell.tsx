import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Columns3,
  Users,
  FolderKanban,
  LogOut,
  CircleAlert,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: Columns3 },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
]

export function AppShell() {
  const { profile, profiles, signOut, isLocalMode, localSwitchUser } = useAuth()

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-panel/80 backdrop-blur-md lg:border-b-0 lg:border-r">
        <div className="px-5 py-6">
          <p className="font-display text-2xl tracking-tight text-ink">Creative Tugs</p>
          <p className="mt-1 text-sm text-muted">Lightweight CRM</p>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-sea text-white'
                    : 'text-ink-soft hover:bg-paper',
                ].join(' ')
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-line px-5 py-4 lg:block">
          {isLocalMode && (
            <div className="mb-4 rounded-lg border border-coral-soft bg-coral-soft/50 p-3 text-xs text-ink-soft">
              <p className="mb-1 flex items-center gap-1 font-semibold text-coral">
                <CircleAlert size={14} /> Demo mode
              </p>
              <p>Connect Supabase for your team of 8. Data stays in this browser until then.</p>
              <label className="mt-2 block">
                <span className="text-muted">Act as</span>
                <select
                  className="mt-1 w-full rounded-md border border-line bg-panel px-2 py-1.5"
                  value={profile?.id ?? ''}
                  onChange={(e) => localSwitchUser(e.target.value)}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{profile?.full_name}</p>
              <p className="truncate text-xs text-muted">{profile?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md p-2 text-muted hover:bg-paper hover:text-ink"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
