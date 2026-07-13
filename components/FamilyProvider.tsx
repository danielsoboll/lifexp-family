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
import {
  clearChildImpersonationBackup,
  isChildImpersonationActive,
  readChildImpersonationBackup,
  storeChildImpersonationBackup,
} from '../lib/family/childImpersonation'
import { formatParentDisplayName } from '../lib/family/familyDisplayName'
import { fetchFamilyById, fetchParentById } from '../lib/family/families'
import { migrateLegacySetupGuideIfNeeded } from '../lib/family/setupGuide'
import { sessionHasAdminAccess } from '../lib/family/memberAdmin'
import { ensureRecurringQuestInstances } from '../lib/family/recurringQuests'
import { syncAllPersonalGoalsForFamily } from '../lib/family/personalGoals'
import { isFamilyPlus } from '../lib/family/familyPlus'
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
import { reportAppError, STUCK_LOADING_MS } from '../lib/errorNotbremse'

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
  refreshXpTotals: () => Promise<void>
  patchFamily: (patch: Partial<Family>) => void
  applyTodayXpDelta: (memberKind: FamilySessionMemberKind, memberId: string, delta: number) => void
  setSession: (session: FamilySession) => void
  isImpersonatingChild: boolean
  impersonationParentLabel: string | null
  impersonationParentId: string | null
  startChildImpersonation: (childId: string) => void
  endChildImpersonation: () => string | null
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
  const sessionEstablishedRef = useRef(false)
  const refreshGenerationRef = useRef(0)

  const refreshXpTotals = useCallback(async () => {
    const stored = readFamilySession()
    if (!stored?.familyId) return

    const { childTotals, parentTotals, error: xpError } = await fetchTodayXpTotalsForFamily(stored.familyId)
    if (xpError) return

    setParents((prev) => prev.map((p) => ({ ...p, todayXp: parentTotals[p.id] ?? 0 })))
    setChildrenWithXp((prev) => prev.map((c) => ({ ...c, todayXp: childTotals[c.id] ?? 0 })))
  }, [])

  const applyTodayXpDelta = useCallback(
    (kind: FamilySessionMemberKind, memberId: string, delta: number) => {
      if (delta <= 0) return
      if (kind === 'child') {
        setChildrenWithXp((prev) =>
          prev.map((child) =>
            child.id === memberId ? { ...child, todayXp: child.todayXp + delta } : child,
          ),
        )
      } else {
        setParents((prev) =>
          prev.map((parent) =>
            parent.id === memberId ? { ...parent, todayXp: parent.todayXp + delta } : parent,
          ),
        )
      }
    },
    [],
  )

  const patchFamily = useCallback((patch: Partial<Family>) => {
    setFamily((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const refresh = useCallback(async () => {
    const generation = ++refreshGenerationRef.current
    bootstrapPwaClientStorage()
    const stored = readFamilySession()
    setSessionState(stored)

    const clearStuckLoading = () => {
      if (generation !== refreshGenerationRef.current) return
      setLoading(false)
    }

    const stuckTimer =
      typeof window !== 'undefined'
        ? window.setTimeout(() => {
            clearStuckLoading()
            reportAppError('Laden dauert ungewöhnlich lange.', 'loading-timeout')
          }, STUCK_LOADING_MS)
        : null

    try {

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
      if (sessionEstablishedRef.current) {
        setError('Familie konnte gerade nicht geladen werden. Bitte kurz warten und erneut versuchen.')
        setLoading(false)
        return
      }
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
      const [{ parent: directParent, error: parentError }, { role, error: roleError }] = await Promise.all([
        fetchParentById(stored.memberId),
        fetchMemberRoleForParent(stored.familyId, stored.memberId),
      ])

      if (parentError || roleError) {
        if (sessionEstablishedRef.current) {
          setError(parentError?.message ?? roleError?.message ?? 'Daten konnten gerade nicht geladen werden.')
          setLoading(false)
          return
        }
        setParent(null)
        setActiveChild(null)
        setParents([])
        setCanAdmin(false)
        setChildrenWithXp([])
        setError(parentError?.message ?? roleError?.message ?? 'Daten konnten nicht geladen werden.')
        setLoading(false)
        return
      }

      let parentRow = directParent
      if (!parentRow) {
        const { parents: parentRows } = await fetchParentsForFamily(resolvedFamily.id)
        parentRow = parentRows.find((row) => row.id === stored.memberId) ?? null
      }

      if (!parentRow) {
        if (sessionEstablishedRef.current) {
          setError('Profil konnte gerade nicht geladen werden. Bitte kurz warten und erneut versuchen.')
          setLoading(false)
          return
        }
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
      const { child: directChild, error: childSessionError } = await fetchChildById(stored.memberId)

      if (childSessionError) {
        if (sessionEstablishedRef.current) {
          setError(childSessionError.message)
          setLoading(false)
          return
        }
        setParent(null)
        setActiveChild(null)
        setParents([])
        setCanAdmin(false)
        setChildrenWithXp([])
        setError(childSessionError.message)
        setLoading(false)
        return
      }

      let childRow = directChild
      if (!childRow || childRow.family_id !== resolvedFamily.id) {
        const { children: childRows } = await fetchChildrenForFamily(resolvedFamily.id)
        childRow = childRows.find((row) => row.id === stored.memberId) ?? null
      }

      if (!childRow || childRow.family_id !== resolvedFamily.id) {
        if (sessionEstablishedRef.current) {
          setError('Profil konnte gerade nicht geladen werden. Bitte kurz warten und erneut versuchen.')
          setLoading(false)
          return
        }
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
      setCanAdmin(isChildImpersonationActive(stored) ? false : nextCanAdmin)
      setChildrenWithXp([])
      setError(childError.message)
      setLoading(false)
      return
    }

    const { childTotals, parentTotals, error: xpError } = await fetchTodayXpTotalsForFamily(resolvedFamily.id)

    setParent(nextParent)
    setActiveChild(nextActiveChild)
    setCanAdmin(isChildImpersonationActive(stored) ? false : nextCanAdmin)
    setParents(nextParents.map((p) => ({ ...p, todayXp: parentTotals[p.id] ?? 0 })))
    setChildrenWithXp(
      xpError
        ? childRows.map((c) => ({ ...c, todayXp: 0 }))
        : childRows.map((c) => ({ ...c, todayXp: childTotals[c.id] ?? 0 })),
    )
    if (xpError) setError(xpError.message)
    void syncAllPersonalGoalsForFamily(resolvedFamily.id)
    loadedOnceRef.current = true
    sessionEstablishedRef.current = true
    setLoading(false)
    } finally {
      if (stuckTimer !== null) window.clearTimeout(stuckTimer)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onChange = () => {
      void refreshXpTotals()
      void refresh()
    }
    window.addEventListener(FAMILY_DATA_CHANGED_EVENT, onChange)
    window.addEventListener(FAMILY_SESSION_CHANGED_EVENT, onChange)
    return () => {
      window.removeEventListener(FAMILY_DATA_CHANGED_EVENT, onChange)
      window.removeEventListener(FAMILY_SESSION_CHANGED_EVENT, onChange)
    }
  }, [refresh, refreshXpTotals])

  useEffect(() => {
    if (loading || !family?.id || !isFamilyPlus(family)) return
    void ensureRecurringQuestInstances(family.id).then(({ generated }) => {
      if (generated > 0) notifyFamilyDataChanged()
    })
  }, [loading, family?.id, family?.plan, family?.plus_until, family?.subscription_status, family?.cancel_at_period_end])

  const setSession = useCallback(
    (next: FamilySession) => {
      storeFamilySession(next)
      void refresh()
    },
    [refresh],
  )

  const impersonationBackup = useMemo(() => readChildImpersonationBackup(), [session])
  const isImpersonatingChild = useMemo(
    () => isChildImpersonationActive(session),
    [session, impersonationBackup],
  )

  const startChildImpersonation = useCallback(
    (childId: string) => {
      if (!session || session.memberKind !== 'parent' || !parent || !canAdmin || !family) return
      const child = childrenWithXp.find((row) => row.id === childId)
      if (!child?.no_own_device) return

      storeChildImpersonationBackup({
        parentSession: session,
        parentDisplayName: formatParentDisplayName(parent.display_name, parent.gender),
      })
      storeFamilySession({
        familyId: family.id,
        memberKind: 'child',
        memberId: childId,
      })
    },
    [session, parent, canAdmin, family, childrenWithXp],
  )

  const endChildImpersonation = useCallback((): string | null => {
    const backup = readChildImpersonationBackup()
    if (!backup) return null
    clearChildImpersonationBackup()
    storeFamilySession(backup.parentSession)
    return backup.parentSession.memberId
  }, [])

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
      refreshXpTotals,
      patchFamily,
      applyTodayXpDelta,
      setSession,
      isImpersonatingChild,
      impersonationParentLabel: impersonationBackup?.parentDisplayName ?? null,
      impersonationParentId: impersonationBackup?.parentSession.memberId ?? null,
      startChildImpersonation,
      endChildImpersonation,
    }),
    [
      family,
      parent,
      activeChild,
      memberKind,
      parents,
      childrenWithXp,
      loading,
      canAdmin,
      error,
      session,
      refresh,
      refreshXpTotals,
      patchFamily,
      applyTodayXpDelta,
      setSession,
      isImpersonatingChild,
      impersonationBackup,
      startChildImpersonation,
      endChildImpersonation,
    ],
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
