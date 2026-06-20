import type { ChildGender, ParentGender } from './memberGender'

export const AVATAR_BASE = '/avatars'

/** Dateiname ohne Endung, z. B. Mann_1_1 */
export type AvatarPortraitId = string

export type MemberAvatarCategory =
  | 'parent_male'
  | 'parent_female'
  | 'parent_opa'
  | 'parent_oma'
  | 'child_boy_teen'
  | 'child_boy_young'
  | 'child_girl_teen'
  | 'child_girl_young'
  | 'unavailable'

/** Pro Alters-/Rollen-Kategorie aktuell genau ein passendes Portrait. */
export const PORTRAIT_OPTIONS_BY_CATEGORY: Record<Exclude<MemberAvatarCategory, 'unavailable'>, AvatarPortraitId[]> = {
  parent_male: ['Mann_1_1'],
  parent_female: ['Frau_1_1'],
  parent_opa: ['Opa_1_1'],
  parent_oma: ['Oma_1_1'],
  child_boy_teen: ['Junge_1_1'],
  child_boy_young: ['Junge_2_1'],
  child_girl_teen: ['Mädchen_1_1'],
  child_girl_young: ['Mädchen_2_1'],
}

const PORTRAIT_ID_PATTERN = /^(Mann|Frau|Opa|Oma|Junge|Mädchen)_\d+_\d+t?$/

export function isPortraitId(value: string): boolean {
  return PORTRAIT_ID_PATTERN.test(value)
}

export function portraitSrc(portraitId: AvatarPortraitId): string {
  return `${AVATAR_BASE}/${portraitId}.webp`
}

export function portraitIdFromStored(value: string | null | undefined): AvatarPortraitId | null {
  if (!value || typeof value !== 'string') return null
  const raw = value
  if (isPortraitId(raw)) return raw
  if (raw.startsWith(`${AVATAR_BASE}/`)) {
    const base = raw.slice(AVATAR_BASE.length + 1).replace(/\.webp$/i, '')
    return isPortraitId(base) ? base : null
  }
  return null
}

export function memberAvatarCategoryForParent(gender: ParentGender): MemberAvatarCategory {
  switch (gender) {
    case 'male':
      return 'parent_male'
    case 'female':
      return 'parent_female'
    case 'opa':
      return 'parent_opa'
    case 'oma':
      return 'parent_oma'
  }
}

export function memberAvatarCategoryForChild(
  gender: ChildGender,
  age: number | null | undefined,
): MemberAvatarCategory {
  if (age === null || age === undefined || !Number.isFinite(age)) return 'unavailable'

  const years = Math.floor(age)

  if (gender === 'boy') {
    if (years >= 9) return 'child_boy_teen'
    if (years >= 2) return 'child_boy_young'
    return 'unavailable'
  }

  if (years >= 9) return 'child_girl_teen'
  if (years >= 2 && years <= 8) return 'child_girl_young'
  return 'unavailable'
}

export function defaultPortraitForCategory(category: MemberAvatarCategory): AvatarPortraitId | null {
  if (category === 'unavailable') return null
  return PORTRAIT_OPTIONS_BY_CATEGORY[category][0] ?? null
}

export function portraitOptionsForCategory(category: MemberAvatarCategory): AvatarPortraitId[] {
  if (category === 'unavailable') return []
  return PORTRAIT_OPTIONS_BY_CATEGORY[category]
}

export type ResolvedMemberAvatar = {
  category: MemberAvatarCategory
  portraitId: AvatarPortraitId | null
  src: string | null
  options: AvatarPortraitId[]
  error: string | null
}

export function resolveParentAvatar(
  gender: ParentGender,
  storedAvatarUrl: string | null | undefined,
): ResolvedMemberAvatar {
  const category = memberAvatarCategoryForParent(gender)
  const options = portraitOptionsForCategory(category)
  const stored = portraitIdFromStored(storedAvatarUrl)
  const portraitId =
    stored && options.includes(stored) ? stored : defaultPortraitForCategory(category)

  return {
    category,
    portraitId,
    src: portraitId ? portraitSrc(portraitId) : null,
    options,
    error: null,
  }
}

export function resolveChildAvatar(
  gender: ChildGender,
  age: number | null | undefined,
  storedPortraitId: string | null | undefined,
): ResolvedMemberAvatar {
  const category = memberAvatarCategoryForChild(gender, age)
  const options = portraitOptionsForCategory(category)

  if (category === 'unavailable') {
    return {
      category,
      portraitId: null,
      src: null,
      options: [],
      error: age === null || age === undefined ? 'Bitte Alter angeben für ein Portrait.' : null,
    }
  }

  const stored = portraitIdFromStored(storedPortraitId)
  const portraitId =
    stored && options.includes(stored) ? stored : defaultPortraitForCategory(category)

  return {
    category,
    portraitId,
    src: portraitId ? portraitSrc(portraitId) : null,
    options,
    error: null,
  }
}

/** @deprecated Nutze resolveParentAvatar / resolveChildAvatar */
export function avatarForParent(gender: ParentGender) {
  const resolved = resolveParentAvatar(gender, null)
  return { src: resolved.src, error: resolved.error }
}

/** @deprecated Nutze resolveChildAvatar */
export function avatarForChild(gender: ChildGender, age: number | null | undefined) {
  const resolved = resolveChildAvatar(gender, age, null)
  return { src: resolved.src, error: resolved.error }
}

export function memberTodayXpLabel(todayXp: number): string {
  return `+${todayXp} XP heute`
}

export function coercePortraitForCategory(
  category: MemberAvatarCategory,
  portraitId: AvatarPortraitId | null | undefined,
): AvatarPortraitId | null {
  const options = portraitOptionsForCategory(category)
  if (options.length === 0) return null
  if (portraitId && options.includes(portraitId)) return portraitId
  return defaultPortraitForCategory(category)
}
