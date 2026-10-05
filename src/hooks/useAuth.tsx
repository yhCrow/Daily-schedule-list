import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { isDemo, supabase } from '../lib/backend'

type OwnerStatus = 'unknown' | 'owner' | 'not-owner'

interface AuthState {
  loading: boolean
  session: Session | null
  email: string | null
  owner: OwnerStatus
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(!isDemo)
  const [session, setSession] = useState<Session | null>(null)
  const [owner, setOwner] = useState<OwnerStatus>(isDemo ? 'owner' : 'unknown')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Ask the server whether this account is the single allowed owner.
  useEffect(() => {
    if (!supabase || !session) {
      if (!isDemo) setOwner('unknown')
      return
    }
    let cancelled = false
    supabase.rpc('is_owner').then(({ data, error }) => {
      if (!cancelled) setOwner(!error && data === true ? 'owner' : 'not-owner')
    })
    return () => {
      cancelled = true
    }
  }, [session])

  const value: AuthState = {
    loading,
    session,
    email: isDemo ? 'demo mode' : (session?.user.email ?? null),
    owner,
    async signIn(email, password) {
      if (!supabase) return 'Supabase is not configured.'
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? error.message : null
    },
    async signOut() {
      await supabase?.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
