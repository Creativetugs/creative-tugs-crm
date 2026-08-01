import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Profile } from '../types'
import { getLocalSessionUserId, listProfiles, setLocalSessionUserId } from '../lib/api'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface AuthState {
  loading: boolean
  userId: string | null
  profile: Profile | null
  profiles: Profile[]
  isLocalMode: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (fullName: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  localSwitchUser: (profileId: string) => void
  refreshProfiles: () => Promise<Profile[]>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])

  const refreshProfiles = useCallback(async () => {
    const rows = await listProfiles()
    setProfiles(rows)
    return rows
  }, [])

  const resolveProfile = useCallback(async (id: string | null) => {
    if (!id) {
      setUserId(null)
      setProfile(null)
      return
    }
    const rows = await refreshProfiles()
    setUserId(id)
    setProfile(rows.find((p) => p.id === id) ?? null)
  }, [refreshProfiles])

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        await refreshProfiles()

        if (!isSupabaseConfigured || !supabase) {
          const localId = getLocalSessionUserId()
          if (mounted) await resolveProfile(localId)
          return
        }

        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        await resolveProfile(data.session?.user.id ?? null)

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          void resolveProfile(session?.user.id ?? null)
        })
        return () => sub.subscription.unsubscribe()
      } finally {
        if (mounted) setLoading(false)
      }
    }

    let cleanup: (() => void) | undefined
    void boot().then((fn) => {
      cleanup = fn
    })

    return () => {
      mounted = false
      cleanup?.()
    }
  }, [resolveProfile, refreshProfiles])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      const rows = await listProfiles()
      const match = rows.find((p) => p.email.toLowerCase() === email.toLowerCase())
      if (!match) throw new Error('Local demo: pick a team member from the list, or use demo@creativetugs.io')
      setLocalSessionUserId(match.id)
      await resolveProfile(match.id)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [resolveProfile])

  const signUp = useCallback(async (fullName: string, email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Sign-up needs Supabase. Local demo mode uses the sample team.')
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLocalSessionUserId(null)
      await resolveProfile(null)
      return
    }
    await supabase.auth.signOut()
  }, [resolveProfile])

  const localSwitchUser = useCallback((profileId: string) => {
    if (isSupabaseConfigured) return
    setLocalSessionUserId(profileId)
    void resolveProfile(profileId)
  }, [resolveProfile])

  const value = useMemo(
    () => ({
      loading,
      userId,
      profile,
      profiles,
      isLocalMode: !isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      localSwitchUser,
      refreshProfiles,
    }),
    [
      loading,
      userId,
      profile,
      profiles,
      signIn,
      signUp,
      signOut,
      localSwitchUser,
      refreshProfiles,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
