'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { AUTH_STATE_CHANGED_EVENT, useAuth } from './AuthProvider'
import { fetchFamiliesForUser } from '../lib/family/families'
import { fetchChildrenForFamily } from '../lib/family/children'
import { attachTodayXpToChildren } from '../lib/family/xp'
import type { ChildWithTodayXp, Family } from '../lib/family/types'

const ACTIVE_FAMILY_KEY = 'lifexp_family_active_id'

export const FAMILY_DATA_CHANGED_EVENT = 'lifexp-family-data-changed'

type FamilyContextValue = {
  family: Family | null
  children: ChildWithTodayXp[]
  loading: boolean
  hasFamily: boolean
  error: string | null
  refresh: () => Promise<void>
  setActiveFamilyId: (familyId: string) => void
}

const FamilyContext = createContext<FamilyContextValue | null>(null)

function readStoredFamilyId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_FAMILY_KEY)
}

function storeFamilyId(familyId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVE_FAMILY_KEY, familyId)
}

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [family, setFamily] = useState<Family | null>(null)
  const [childrenWithXp, setChildrenWithXp] = useState<ChildWithTodayXp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setFamily(null)
      setChildrenWithXp([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { families, error: familiesError } = await fetchFamiliesForUser()
    if (familiesError) {
      setFamily(null)
      setChildrenWithXp([])
      setError(familiesError.message)
      setLoading(false)
      return
    }

    if (families.length === 0) {
      setFamily(null)
      setChildrenWithXp([])
      setLoading(false)
      return
    }

    const storedId = readStoredFamilyId()
    const active = families.find((f) => f.id === storedId) ?? families[0] ?? null

    if (!active) {
      setFamily(null)
      setChildrenWithXp([])
      setLoading(false)
      return
    }

    storeFamilyId(active.id)
    setFamily(active)

    const { children: childRows, error: childError } = await fetchChildrenForFamily(active.id)
    if (childError) {
      setChildrenWithXp([])
      setError(childError.message)
      setLoading(false)
      return
    }

    const { children: enriched, error: xpError } = await attachTodayXpToChildren(childRows, active.id)
    setChildrenWithXp(
      xpError ? childRows.map((c) => ({ ...c, todayXp: 0 })) : enriched,
    )
    if (xpError) setError(xpError.message)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (authLoading) return
    void refresh()
  }, [authLoading, refresh, user?.id])

  useEffect(() => {
    const onChange = () => void refresh()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, onChange)
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, onChange)
    return () => {
      window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, onChange)
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, onChange)
    }
  }, [refresh])

  const setActiveFamilyId = useCallback(
    (familyId: string) => {
      storeFamilyId(familyId)
      void refresh()
    },
    [refresh],
  )

  const value = useMemo<FamilyContextValue>(
    () => ({
      family,
      children: childrenWithXp,
      loading: authLoading || loading,
      hasFamily: Boolean(family),
      error,
      refresh,
      setActiveFamilyId,
    }),
    [family, childrenWithXp, authLoading, loading, error, refresh, setActiveFamilyId],
  )

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext)
  if (!ctx) throw new Error('useFamily muss innerhalb von FamilyProvider verwendet werden.')
  return ctx
}

export function notifyFamilyDataChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(FAMILY_DATA_CHANGED_EVENT))
}
