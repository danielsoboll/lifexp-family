/** Lokale Browser-Session — keine Supabase Auth, family_id + Mitglied (Elternteil oder Kind). */

export const FAMILY_ID_KEY = 'lifexp_family_id'
export const MEMBER_KIND_KEY = 'lifexp_member_kind'
export const MEMBER_ID_KEY = 'lifexp_member_id'

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

  if (!familyId || !memberId || !memberKind) return null
  return { familyId, memberKind, memberId }
}

export function storeFamilySession(session: FamilySession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(FAMILY_ID_KEY, session.familyId)
  localStorage.setItem(MEMBER_KIND_KEY, session.memberKind)
  localStorage.setItem(MEMBER_ID_KEY, session.memberId)
  if (session.memberKind === 'parent') {
    localStorage.setItem(PARENT_ID_KEY, session.memberId)
  } else {
    localStorage.removeItem(PARENT_ID_KEY)
  }
  localStorage.removeItem(LEGACY_ACTIVE_FAMILY_KEY)
  window.dispatchEvent(new Event(FAMILY_SESSION_CHANGED_EVENT))
}

export function clearFamilySession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FAMILY_ID_KEY)
  localStorage.removeItem(MEMBER_KIND_KEY)
  localStorage.removeItem(MEMBER_ID_KEY)
  localStorage.removeItem(PARENT_ID_KEY)
  localStorage.removeItem(LEGACY_ACTIVE_FAMILY_KEY)
  window.dispatchEvent(new Event(FAMILY_SESSION_CHANGED_EVENT))
}

/** Alle App-localStorage-Einträge dieser Family-App löschen (Theme bleibt). */
export function clearLifeXpFamilyAppStorage(): void {
  if (typeof window === 'undefined') return

  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
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
