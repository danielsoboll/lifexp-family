import { clearAvatarDisplayCache } from './avatarDisplayCache'
import {
  matchesScopedClientStorageKey,
} from './clientStorageScope'
import {
  collectScopedLifeexpLocalKeys,
  collectScopedLifeexpSessionKeys,
  scopedLocalGet,
  scopedLocalRemove,
  scopedLocalSet,
} from './scopedClientStorage'
import {
  FAMILY_ONBOARDING_DRAFT_COOKIE_KEY,
  clearFamilyOnboardingDraft,
} from './family/onboardingDraft'
import { clearBridgedCookie, getBridgedCookie, setBridgedCookie } from './bridgedStorage'
import { THEME_STORAGE_KEY } from './theme'

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
  scopedLocalSet(FAMILY_ID_KEY, session.familyId)
  scopedLocalSet(MEMBER_KIND_KEY, session.memberKind)
  scopedLocalSet(MEMBER_ID_KEY, session.memberId)
  if (session.memberKind === 'parent') {
    scopedLocalSet(PARENT_ID_KEY, session.memberId)
  } else {
    scopedLocalRemove(PARENT_ID_KEY)
  }
  scopedLocalRemove(LEGACY_ACTIVE_FAMILY_KEY)
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

  let familyId = scopedLocalGet(FAMILY_ID_KEY)
  let memberKind = normalizeMemberKind(scopedLocalGet(MEMBER_KIND_KEY))
  let memberId = scopedLocalGet(MEMBER_ID_KEY)
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
    familyId = scopedLocalGet(FAMILY_ID_KEY)
    memberKind = scopedLocalGet(MEMBER_KIND_KEY)
    memberId = scopedLocalGet(MEMBER_ID_KEY)
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

  let familyId = scopedLocalGet(FAMILY_ID_KEY)
  let memberKind = normalizeMemberKind(scopedLocalGet(MEMBER_KIND_KEY))
  let memberId = scopedLocalGet(MEMBER_ID_KEY)

  if (!familyId) {
    const legacy = scopedLocalGet(LEGACY_ACTIVE_FAMILY_KEY)
    if (legacy) {
      familyId = legacy
      scopedLocalSet(FAMILY_ID_KEY, legacy)
      scopedLocalRemove(LEGACY_ACTIVE_FAMILY_KEY)
    }
  }

  if (!memberId) {
    const legacyParentId = scopedLocalGet(PARENT_ID_KEY)
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
  scopedLocalRemove(FAMILY_ID_KEY)
  scopedLocalRemove(MEMBER_KIND_KEY)
  scopedLocalRemove(MEMBER_ID_KEY)
  scopedLocalRemove(PARENT_ID_KEY)
  scopedLocalRemove(LEGACY_ACTIVE_FAMILY_KEY)
  clearSessionCookie()
  window.dispatchEvent(new Event(FAMILY_SESSION_CHANGED_EVENT))
}

const PRESERVED_ON_RESET_LOCAL_KEYS = new Set([
  THEME_STORAGE_KEY,
  'lifexp_family_life_xp_de_initialized',
])

const PRESERVED_ON_RESET_COOKIE_KEYS = new Set(['lifexp_t', 'lifexp_fxd'])

function isPreservedResetCookieName(name: string): boolean {
  for (const base of PRESERVED_ON_RESET_COOKIE_KEYS) {
    if (matchesScopedClientStorageKey(name, base)) return true
  }
  return false
}

function clearLifeXpCookiesExceptPreserved(): void {
  if (typeof document === 'undefined') return
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const name = trimmed.slice(0, eq)
    if (!name.startsWith('lifexp_')) continue
    if (isPreservedResetCookieName(name)) continue
    const baseName = name.endsWith('_dev') ? name.slice(0, -4) : name
    clearBridgedCookie(baseName)
  }
}

/**
 * Session, Onboarding-Entwurf, Assistent-Cache und alle lifexp_*-Cookies löschen.
 * Theme und Domain-Marker bleiben — danach startet man beim Willkommens-Onboarding.
 */
export function resetLifeXpFamilyClientState(): void {
  if (typeof window === 'undefined') return

  clearFamilySession()
  clearFamilyOnboardingDraft()
  clearAvatarDisplayCache()

  const localKeys = collectScopedLifeexpLocalKeys().filter(
    (key) => ![...PRESERVED_ON_RESET_LOCAL_KEYS].some((base) => matchesScopedClientStorageKey(key, base)),
  )
  for (const key of localKeys) {
    localStorage.removeItem(key)
  }

  for (const key of collectScopedLifeexpSessionKeys()) {
    sessionStorage.removeItem(key)
  }

  clearLifeXpCookiesExceptPreserved()
  clearBridgedCookie(FAMILY_SESSION_COOKIE_KEY)
  clearBridgedCookie(FAMILY_ONBOARDING_DRAFT_COOKIE_KEY)

  window.dispatchEvent(new Event(FAMILY_SESSION_CHANGED_EVENT))
  window.dispatchEvent(new Event('lifexp-setup-guide-changed'))
}

/** @deprecated Nutze resetLifeXpFamilyClientState — löscht Session ohne Cookies/Onboarding. */
export function clearLifeXpFamilyAppStorage(): void {
  resetLifeXpFamilyClientState()
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
