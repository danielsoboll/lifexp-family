import { memberPortraitTierFromDailyXp } from './dailyXpDisplay'
import type { ChildGender, ParentGender } from './memberGender'

/** Onboarding-Rollen — re-exportiert für Portrait-Optionen ohne Zirkelimport. */
export type OnboardingPortraitGender = ParentGender | ChildGender

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

/** Pro Alters-/Rollen-Kategorie wählbare Portrait-Stämme (_1 = Happy-Basis). */
export const PORTRAIT_OPTIONS_BY_CATEGORY: Record<Exclude<MemberAvatarCategory, 'unavailable'>, AvatarPortraitId[]> = {
  parent_male: ['Mann_1_1', 'Mann_2_1'],
  parent_female: ['Frau_1_1', 'Frau_2_1'],
  parent_opa: ['Opa_1_1'],
  parent_oma: ['Oma_1_1'],
  child_boy_teen: ['Junge_1_1', 'Junge_3_1'],
  child_boy_young: ['Junge_2_1', 'Junge_4_1'],
  child_girl_teen: ['Mädchen_1_1', 'Mädchen_3_1'],
  child_girl_young: ['Mädchen_2_1', 'Mädchen_4_1'],
}

const PORTRAIT_ID_PATTERN = /^(Mann|Frau|Opa|Oma|Junge|Mädchen)_\d+_\d+t?$/
const PORTRAIT_ID_PARTS_PATTERN = /^(Mann|Frau|Opa|Oma|Junge|Mädchen)_(\d+)_(\d+)(t?)$/

/** Vorhandene Dateien unter /public/avatars/ — fehlende Stufen fallen auf die letzte verfügbare zurück. */
export const AVAILABLE_PORTRAIT_IDS = new Set<AvatarPortraitId>([
  'Frau_1_1',
  'Frau_1_2',
  'Frau_2_1',
  'Junge_1_1',
  'Junge_1_2',
  'Junge_1_3t',
  'Junge_1_4',
  'Junge_1_5',
  'Junge_1_6',
  'Junge_2_1',
  'Junge_2_2',
  'Junge_2_3',
  'Junge_2_4',
  'Junge_3_1',
  'Junge_4_1',
  'Mann_1_1',
  'Mann_1_2',
  'Mann_1_3',
  'Mann_2_1',
  'Mädchen_1_1',
  'Mädchen_1_2',
  'Mädchen_1_3',
  'Mädchen_1_4',
  'Mädchen_1_5',
  'Mädchen_1_6',
  'Mädchen_2_1',
  'Mädchen_3_1',
  'Mädchen_4_1',
])

export function isPortraitId(value: string): boolean {
  return PORTRAIT_ID_PATTERN.test(value)
}

export function portraitSrc(portraitId: AvatarPortraitId): string {
  return `${AVATAR_BASE}/${portraitId}.webp`
}

export type ResolveMemberAvatarOptions = {
  /** Tages-XP: steuert Stufe _2 … _6; ohne Angabe bleibt die gespeicherte Basis-Stufe. */
  todayXp?: number
}

function parsePortraitStem(portraitId: AvatarPortraitId): { stem: string; suffix: string } | null {
  const match = portraitId.match(PORTRAIT_ID_PARTS_PATTERN)
  if (!match) return null
  return { stem: `${match[1]}_${match[2]}`, suffix: match[4] ?? '' }
}

/** Gespeichertes Portrait (evtl. XP-Stufe) auf wählbare Basis-Option mappen. */
export function basePortraitOptionForOptions(
  portraitId: AvatarPortraitId | null | undefined,
  options: readonly AvatarPortraitId[],
): AvatarPortraitId | null {
  if (options.length === 0) return null
  if (portraitId && options.includes(portraitId)) return portraitId
  const parsed = portraitId ? parsePortraitStem(portraitId) : null
  if (parsed) {
    for (const option of options) {
      const optionParsed = parsePortraitStem(option)
      if (optionParsed?.stem === parsed.stem) return option
    }
  }
  return options[0] ?? null
}

export function coercePortraitForOptions(
  portraitId: AvatarPortraitId | null | undefined,
  options: readonly AvatarPortraitId[],
): AvatarPortraitId {
  return basePortraitOptionForOptions(portraitId, options) ?? options[0]
}

function portraitIdCandidates(stem: string, tier: number, suffix: string): AvatarPortraitId[] {
  const primary = `${stem}_${tier}${suffix}` as AvatarPortraitId
  if (suffix) return [primary]
  const withTeenSuffix = `${stem}_${tier}t` as AvatarPortraitId
  return primary === withTeenSuffix ? [primary] : [primary, withTeenSuffix]
}

export function portraitIdForDailyXp(
  basePortraitId: AvatarPortraitId,
  todayXp: number,
  availableIds: ReadonlySet<string> = AVAILABLE_PORTRAIT_IDS,
): AvatarPortraitId {
  const parsed = parsePortraitStem(basePortraitId)
  if (!parsed) return basePortraitId

  const targetTier = memberPortraitTierFromDailyXp(todayXp)
  for (let tier = targetTier; tier >= 1; tier--) {
    for (const candidate of portraitIdCandidates(parsed.stem, tier, parsed.suffix)) {
      if (availableIds.has(candidate)) return candidate
    }
  }

  return basePortraitId
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

/** Onboarding: Auswahl ohne Alter — Opa/Oma nutzen dieselben Stämme wie Papa/Mama. */
export const ONBOARDING_PORTRAIT_OPTIONS_BY_GENDER: Record<OnboardingPortraitGender, AvatarPortraitId[]> = {
  male: ['Mann_1_1', 'Mann_2_1'],
  female: ['Frau_1_1', 'Frau_2_1'],
  opa: ['Mann_1_1', 'Mann_2_1'],
  oma: ['Frau_1_1', 'Frau_2_1'],
  boy: ['Junge_1_1', 'Junge_2_1', 'Junge_3_1', 'Junge_4_1'],
  girl: ['Mädchen_1_1', 'Mädchen_2_1', 'Mädchen_3_1', 'Mädchen_4_1'],
}

export function portraitOptionsForOnboardingGender(gender: OnboardingPortraitGender): AvatarPortraitId[] {
  return ONBOARDING_PORTRAIT_OPTIONS_BY_GENDER[gender]
}

export function defaultOnboardingPortrait(gender: OnboardingPortraitGender): AvatarPortraitId {
  return ONBOARDING_PORTRAIT_OPTIONS_BY_GENDER[gender][0]
}

export function coerceOnboardingPortrait(
  gender: OnboardingPortraitGender,
  portraitId: AvatarPortraitId | null | undefined,
): AvatarPortraitId {
  const options = portraitOptionsForOnboardingGender(gender)
  if (portraitId && options.includes(portraitId)) return portraitId
  return options[0]
}

export function resolveOnboardingAvatar(
  gender: OnboardingPortraitGender,
  portraitId: AvatarPortraitId | null | undefined,
): ResolvedMemberAvatar {
  const options = portraitOptionsForOnboardingGender(gender)
  const resolvedId = coerceOnboardingPortrait(gender, portraitId)
  return {
    category: 'unavailable',
    portraitId: resolvedId,
    src: portraitSrc(resolvedId),
    options,
    error: null,
  }
}

export function resolveParentAvatar(
  gender: ParentGender,
  storedAvatarUrl: string | null | undefined,
  resolveOptions?: ResolveMemberAvatarOptions,
): ResolvedMemberAvatar {
  const category = memberAvatarCategoryForParent(gender)
  const options = portraitOptionsForCategory(category)
  const stored = portraitIdFromStored(storedAvatarUrl)
  let portraitId =
    stored && options.includes(stored) ? stored : defaultPortraitForCategory(category)

  if (portraitId && resolveOptions?.todayXp !== undefined) {
    portraitId = portraitIdForDailyXp(portraitId, resolveOptions.todayXp)
  }

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
  resolveOptions?: ResolveMemberAvatarOptions,
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
  let portraitId =
    stored && options.includes(stored) ? stored : defaultPortraitForCategory(category)

  if (portraitId && resolveOptions?.todayXp !== undefined) {
    portraitId = portraitIdForDailyXp(portraitId, resolveOptions.todayXp)
  }

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
