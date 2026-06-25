'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { fetchChildById, fetchChildrenForFamily } from '../lib/family/children'
import { fetchFamilyById, fetchParentById } from '../lib/family/families'
import { migrateLegacySetupGuideIfNeeded } from '../lib/family/setupGuide'
import { sessionHasAdminAccess } from '../lib/family/memberAdmin'
import { fetchMemberRoleForParent, fetchParentsForFamily, isAdminRole, type ParentMember } from '../lib/family/members'
import { fetchTodayXpTotalsForFamily } from '../lib/family/xp'
import { bootstrapPwaClientStorage } from '../lib/pwaClientStorage'
import {
  FAMILY_SESSION_CHANGED_EVENT,
  clearFamilySession,
  resetLifeXpFamilyClientState,
  readFamilySession,
  storeFamilySession,
  type FamilySession,
  type FamilySessionMemberKind,
} from '../lib/familySession'
import type { ChildProfile, ChildWithTodayXp, Family, ParentProfile } from '../lib/family/types'

export const FAMILY_DATA_CHANGED_EVENT = 'lifexp-family-data-changed'

type FamilyContextValue = {
  family: Family | null
  parent: ParentProfile | null
  activeChild: ChildProfile | null
  memberKind: FamilySessionMemberKind | null
  parents: ParentMember[]
  children: ChildWithTodayXp[]
  loading: boolean
  hasSession: boolean
  hasFamily: boolean
  canAdmin: boolean
  error: string | null
  session: FamilySession | null
  refresh: () => Promise<void>
  setSession: (session: FamilySession) => void
}

const FamilyContext = createContext<FamilyContextValue | null>(null)

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<Family | null>(null)
  const [parent, setParent] = useState<ParentProfile | null>(null)
  const [activeChild, setActiveChild] = useState<ChildProfile | null>(null)
  const [memberKind, setMemberKind] = useState<FamilySessionMemberKind | null>(null)
  const [parents, setParents] = useState<ParentMember[]>([])
  const [canAdmin, setCanAdmin] = useState(false)
  const [childrenWithXp, setChildrenWithXp] = useState<ChildWithTodayXp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSessionState] = useState<FamilySession | null>(null)
  const loadedOnceRef = useRef(false)

  const refresh = useCallback(async () => {
    bootstrapPwaClientStorage()
    const stored = readFamilySession()
    setSessionState(stored)

    if (!stored) {
      loadedOnceRef.current = false
      setFamily(null)
      setParent(null)
      setActiveChild(null)
      setMemberKind(null)
      setParents([])
      setCanAdmin(false)
      setChildrenWithXp([])
      setError(null)
      setLoading(false)
      return
    }

    if (!loadedOnceRef.current) {
      setLoading(true)
    }
    setError(null)
    setMemberKind(stored.memberKind)

    const { family: familyRow, error: familyError } = await fetchFamilyById(stored.familyId)

    if (familyError) {
      setFamily(null)
      setParent(null)
      setActiveChild(null)
      setParents([])
      setCanAdmin(false)
      setChildrenWithXp([])
      setError(familyError.message)
      setLoading(false)
      return
    }

    if (!familyRow) {
      resetLifeXpFamilyClientState()
      setSessionState(null)
      setFamily(null)
      setParent(null)
      setActiveChild(null)
      setMemberKind(null)
      setParents([])
      setCanAdmin(false)
      setChildrenWithXp([])
      setError('Gespeicherte Familie nicht gefunden. Bitte neu verbinden.')
      setLoading(false)
      return
    }

    let resolvedFamily = familyRow
    if (await migrateLegacySetupGuideIfNeeded(familyRow)) {
      const { family: refetched } = await fetchFamilyById(familyRow.id)
      if (refetched) resolvedFamily = refetched
    }

    setFamily(resolvedFamily)

    let nextParent: ParentProfile | null = null
    let nextActiveChild: ChildProfile | null = null
    let nextParents: ParentMember[] = []
    let nextCanAdmin = false

    if (stored.memberKind === 'parent') {
      const [{ parent: parentRow, error: parentError }, { role, error: roleError }] = await Promise.all([
        fetchParentById(stored.memberId),
        fetchMemberRoleForParent(stored.familyId, stored.memberId),
      ])

      if (parentError || roleError) {
        setParent(null)
        setActiveChild(null)
        setParents([])
        setCanAdmin(false)
        setChildrenWithXp([])
        setError(parentError?.message ?? roleError?.message ?? 'Daten konnten nicht geladen werden.')
        setLoading(false)
        return
      }

      if (!parentRow) {
        resetLifeXpFamilyClientState()
        setSessionState(null)
        setFamily(null)
        setParent(null)
        setActiveChild(null)
        setMemberKind(null)
        setParents([])
        setCanAdmin(false)
        setChildrenWithXp([])
        setError('Gespeichertes Profil nicht gefunden. Bitte neu verbinden.')
        setLoading(false)
        return
      }

      nextParent = parentRow
      nextCanAdmin = sessionHasAdminAccess('parent', parentRow.can_admin, isAdminRole(role))

      const { parents: parentRows, error: parentsError } = await fetchParentsForFamily(resolvedFamily.id)
      if (parentsError) {
        nextParents = [{ ...parentRow, role: role ?? 'parent', todayXp: 0 }]
      } else {
        nextParents =
          parentRows.length > 0
            ? parentRows
            : [{ ...parentRow, role: role ?? 'parent', gender: parentRow.gender, todayXp: 0 }]
      }
    } else {
      const { child: childRow, error: childSessionError } = await fetchChildById(stored.memberId)

      if (childSessionError) {
        setParent(null)
        setActiveChild(null)
        setParents([])
        setCanAdmin(false)
        setChildrenWithXp([])
        setError(childSessionError.message)
        setLoading(false)
        return
      }

      if (!childRow || childRow.family_id !== resolvedFamily.id) {
        resetLifeXpFamilyClientState()
        setSessionState(null)
        setFamily(null)
        setParent(null)
        setActiveChild(null)
        setMemberKind(null)
        setParents([])
        setCanAdmin(false)
        setChildrenWithXp([])
        setError('Gespeichertes Profil nicht gefunden. Bitte neu verbinden.')
        setLoading(false)
        return
      }

      nextActiveChild = childRow
      nextCanAdmin = sessionHasAdminAccess('child', childRow.can_admin)

      const { parents: parentRows, error: parentsError } = await fetchParentsForFamily(resolvedFamily.id)
      nextParents = parentsError ? [] : parentRows
    }

    const { children: childRows, error: childError } = await fetchChildrenForFamily(resolvedFamily.id)

    if (childError) {
      setParent(nextParent)
      setActiveChild(nextActiveChild)
      setParents(nextParents)
      setCanAdmin(nextCanAdmin)
      setChildrenWithXp([])
      setError(childError.message)
      setLoading(false)
      return
    }

    const { childTotals, parentTotals, error: xpError } = await fetchTodayXpTotalsForFamily(resolvedFamily.id)

    setParent(nextParent)
    setActiveChild(nextActiveChild)
    setCanAdmin(nextCanAdmin)
    setParents(nextParents.map((p) => ({ ...p, todayXp: parentTotals[p.id] ?? 0 })))
    setChildrenWithXp(
      xpError
        ? childRows.map((c) => ({ ...c, todayXp: 0 }))
        : childRows.map((c) => ({ ...c, todayXp: childTotals[c.id] ?? 0 })),
    )
    if (xpError) setError(xpError.message)
    loadedOnceRef.current = true
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onChange = () => void refresh()
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, onChange)
    window.addEventListener(FAMILY_SESSION_CHANGED_EVENT, onChange)
    return () => {
      window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, onChange)
      window.removeEventListener(FAMILY_SESSION_CHANGED_EVENT, onChange)
    }
  }, [refresh])

  const setSession = useCallback(
    (next: FamilySession) => {
      storeFamilySession(next)
      void refresh()
    },
    [refresh],
  )

  const value = useMemo<FamilyContextValue>(
    () => ({
      family,
      parent,
      activeChild,
      memberKind,
      parents,
      children: childrenWithXp,
      loading,
      hasSession: Boolean(session),
      hasFamily: Boolean(family && (parent || activeChild)),
      canAdmin,
      error,
      session,
      refresh,
      setSession,
    }),
    [family, parent, activeChild, memberKind, parents, childrenWithXp, loading, canAdmin, error, session, refresh, setSession],
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
