import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { signIn, signUp, userId, loading, isLocalMode, profiles, localSwitchUser } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(isLocalMode ? 'demo@creativetugs.io' : '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && userId) return <Navigate to="/" replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signup') await signUp(fullName, email, password)
      else await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl tracking-tight">Creative Tugs</p>
          <p className="mt-2 text-muted">Pipeline, contacts, and follow-ups — without HubSpot prices.</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-line bg-panel p-6 shadow-[0_20px_50px_-30px_rgba(19,33,43,0.45)]"
        >
          <div className="mb-5 flex gap-2 rounded-lg bg-paper p-1">
            <button
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === 'signin' ? 'bg-panel text-ink shadow-sm' : 'text-muted'}`}
              onClick={() => setMode('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === 'signup' ? 'bg-panel text-ink shadow-sm' : 'text-muted'}`}
              onClick={() => setMode('signup')}
              disabled={isLocalMode}
            >
              Join team
            </button>
          </div>

          {mode === 'signup' && (
            <label className="mb-3 block text-sm">
              <span className="mb-1 block text-ink-soft">Full name</span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-sea"
              />
            </label>
          )}

          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-ink-soft">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-sea"
            />
          </label>

          {!isLocalMode && (
            <label className="mb-4 block text-sm">
              <span className="mb-1 block text-ink-soft">Password</span>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-sea"
              />
            </label>
          )}

          {isLocalMode && (
            <div className="mb-4 rounded-lg border border-line bg-paper p-3 text-sm text-ink-soft">
              <p className="font-medium text-ink">Local demo (no Supabase yet)</p>
              <p className="mt-1 text-xs text-muted">
                Click Sign in, or jump in as a teammate:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => localSwitchUser(p.id)}
                    className="rounded-md border border-line bg-panel px-2 py-1 text-xs hover:border-sea"
                  >
                    {p.full_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mb-3 text-sm text-lost">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Enter CRM'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          Hosted on GitHub Pages · Shared data via Supabase free tier
        </p>
        <p className="mt-1 text-center text-xs">
          <Link to="/setup" className="text-sea hover:underline">
            Setup guide
          </Link>
        </p>
      </div>
    </div>
  )
}
