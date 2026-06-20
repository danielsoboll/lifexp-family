import {
  FAMILY_ONBOARDING_DRAFT_LOCAL_KEY,
} from './family/onboardingDraft'
import { clearBridgedCookie, getBridgedCookie, setBridgedCookie } from './bridgedStorage'

export const FAMILY_ID_KEY = 'lifexp_family_id'
export const MEMBER_KIND_KEY = 'lifexp_member_kind'
export const MEMBER_ID_KEY = 'lifexp_member_id'
export const FAMILY_SESSION_COOKIE_KEY = 'lifexp_fs'

/** @deprecated Nur für Migration von älteren Builds */
export const PARENT_ID_KEY = 'lifexp_parent_id'
/** @deprecated Nur für Migration von älteren Builds */
const LEGACY_ACTIVE_FAMILY_KEY = 'lifexp_family_active_id'

export const FAMILY_SESSION_CHANGED_EVENT = 'lifexp-family-session-changed'

export type FamilySessionMemberKind = 'parent' | 'child'

export type FamilySession = {
  familyId: string
  memberKind: FamilySessionMemberKind
  memberId: string
}

function normalizeMemberKind(value: string | null): FamilySessionMemberKind | null {
  if (value === 'parent' || value === 'child') return value
  return null
}

function parseSessionCookie(raw: string): FamilySession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<FamilySession>
    const familyId = typeof parsed.familyId === 'string' ? parsed.familyId : ''
    const memberId = typeof parsed.memberId === 'string' ? parsed.memberId : ''
    const memberKind =
      parsed.memberKind === 'parent' || parsed.memberKind === 'child' ? parsed.memberKind : null
    if (!familyId || !memberId || !memberKind) return null
    return { familyId, memberId, memberKind }
  } catch {
    return null
  }
}

function writeSessionToLocalStorage(session: FamilySession): void {
  localStorage.setItem(FAMILY_ID_KEY, session.familyId)
  localStorage.setItem(MEMBER_KIND_KEY, session.memberKind)
  localStorage.setItem(MEMBER_ID_KEY, session.memberId)
  if (session.memberKind === 'parent') {
    localStorage.setItem(PARENT_ID_KEY, session.memberId)
  } else {
    localStorage.removeItem(PARENT_ID_KEY)
  }
  localStorage.removeItem(LEGACY_ACTIVE_FAMILY_KEY)
}

function writeSessionCookie(session: FamilySession): void {
  setBridgedCookie(FAMILY_SESSION_COOKIE_KEY, JSON.stringify(session))
}

function clearSessionCookie(): void {
  clearBridgedCookie(FAMILY_SESSION_COOKIE_KEY)
}

/** Cookie → localStorage (PWA-Start). */
export function bootstrapFamilySessionFromCookie(): FamilySession | null {
  if (typeof window === 'undefined') return null

  let familyId = localStorage.getItem(FAMILY_ID_KEY)
  let memberKind = normalizeMemberKind(localStorage.getItem(MEMBER_KIND_KEY))
  let memberId = localStorage.getItem(MEMBER_ID_KEY)
  if (familyId && memberId && memberKind) {
    return { familyId, memberId, memberKind }
  }

  const raw = getBridgedCookie(FAMILY_SESSION_COOKIE_KEY)
  if (!raw) return null

  const session = parseSessionCookie(raw)
  if (!session) return null

  writeSessionToLocalStorage(session)
  return session
}

/** localStorage → Cookie spiegeln. */
export function mirrorFamilySessionToCookie(): void {
  if (typeof window === 'undefined') return

  let familyId: string | null = null
  let memberKind: string | null = null
  let memberId: string | null = null
  try {
    familyId = localStorage.getItem(FAMILY_ID_KEY)
    memberKind = localStorage.getItem(MEMBER_KIND_KEY)
    memberId = localStorage.getItem(MEMBER_ID_KEY)
  } catch {
    /* ignore */
  }

  const kind = normalizeMemberKind(memberKind)
  if (familyId && memberId && kind) {
    writeSessionCookie({ familyId, memberId, memberKind: kind })
    return
  }

  const raw = getBridgedCookie(FAMILY_SESSION_COOKIE_KEY)
  if (!raw) return
  const session = parseSessionCookie(raw)
  if (session) writeSessionCookie(session)
}

export function readFamilySession(): FamilySession | null {
  if (typeof window === 'undefined') return null

  let familyId = localStorage.getItem(FAMILY_ID_KEY)
  let memberKind = normalizeMemberKind(localStorage.getItem(MEMBER_KIND_KEY))
  let memberId = localStorage.getItem(MEMBER_ID_KEY)

  if (!familyId) {
    const legacy = localStorage.getItem(LEGACY_ACTIVE_FAMILY_KEY)
    if (legacy) {
      familyId = legacy
      localStorage.setItem(FAMILY_ID_KEY, legacy)
      localStorage.removeItem(LEGACY_ACTIVE_FAMILY_KEY)
    }
  }

  if (!memberId) {
    const legacyParentId = localStorage.getItem(PARENT_ID_KEY)
    if (legacyParentId) {
      memberId = legacyParentId
      memberKind = 'parent'
    }
  }

  if (!familyId || !memberId || !memberKind) {
    const raw = getBridgedCookie(FAMILY_SESSION_COOKIE_KEY)
    if (raw) {
      const session = parseSessionCookie(raw)
      if (session) {
        writeSessionToLocalStorage(session)
        return session
      }
    }
    return null
  }
  return { familyId, memberKind, memberId }
}

export function storeFamilySession(session: FamilySession): void {
  if (typeof window === 'undefined') return
  writeSessionToLocalStorage(session)
  writeSessionCookie(session)
  window.dispatchEvent(new Event(FAMILY_SESSION_CHANGED_EVENT))
}

export function clearFamilySession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FAMILY_ID_KEY)
  localStorage.removeItem(MEMBER_KIND_KEY)
  localStorage.removeItem(MEMBER_ID_KEY)
  localStorage.removeItem(PARENT_ID_KEY)
  localStorage.removeItem(LEGACY_ACTIVE_FAMILY_KEY)
  clearSessionCookie()
  window.dispatchEvent(new Event(FAMILY_SESSION_CHANGED_EVENT))
}

/** Alle App-localStorage-Einträge dieser Family-App löschen (Theme bleibt). */
export function clearLifeXpFamilyAppStorage(): void {
  if (typeof window === 'undefined') return

  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
    if (key === FAMILY_ONBOARDING_DRAFT_LOCAL_KEY) continue
    if (
      key === FAMILY_ID_KEY ||
      key === MEMBER_KIND_KEY ||
      key === MEMBER_ID_KEY ||
      key === PARENT_ID_KEY ||
      key === LEGACY_ACTIVE_FAMILY_KEY ||
      key.startsWith('lifexp_family') ||
      key.startsWith('lifexp-family')
    ) {
      keys.push(key)
    }
  }
  for (const key of keys) {
    localStorage.removeItem(key)
  }

  window.dispatchEvent(new Event(FAMILY_SESSION_CHANGED_EVENT))
}

export function hasFamilySession(): boolean {
  return readFamilySession() !== null
}

export function getStoredFamilyId(): string | null {
  return readFamilySession()?.familyId ?? null
}

export function getStoredMemberId(): string | null {
  return readFamilySession()?.memberId ?? null
}

export function getStoredMemberKind(): FamilySessionMemberKind | null {
  return readFamilySession()?.memberKind ?? null
}

export function getStoredParentId(): string | null {
  const session = readFamilySession()
  return session?.memberKind === 'parent' ? session.memberId : null
}

export function getStoredChildId(): string | null {
  const session = readFamilySession()
  return session?.memberKind === 'child' ? session.memberId : null
}

/** @deprecated Alias für storeFamilySession — nur parent-Sessions */
export function storeLegacyParentSession(familyId: string, parentId: string): void {
  storeFamilySession({ familyId, memberKind: 'parent', memberId: parentId })
}
