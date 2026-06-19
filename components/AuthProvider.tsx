'use client'

import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { signOut as authSignOut } from '../lib/auth'
import { supabase } from '../lib/supabase'

export const AUTH_STATE_CHANGED_EVENT = 'lifexp-family-auth-changed'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      setSession(null)
      return
    }
    setSession(data.session)
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      await refresh()
      if (!cancelled) setLoading(false)
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT))
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [refresh])

  const signOut = useCallback(async () => {
    await authSignOut()
    setSession(null)
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signOut,
      refresh,
    }),
    [session, loading, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.')
  return ctx
}
