import { memberPortraitTierFromDailyXp } from './dailyXpDisplay'
import type { ChildGender, ParentGender } from './memberGender'
import { isAgeInputCompleteForAvatar, parseAgeInput } from './memberGender'

/** Onboarding-Rollen — re-exportiert für Portrait-Optionen ohne Zirkelimport. */
export type OnboardingPortraitGender = ParentGender | ChildGender

export const AVATAR_BASE = '/avatars'

/** Dateiname ohne Endung, z. B. Mann_1_1 */
export type AvatarPortraitId = string

export type MemberAvatarCategory =
  | 'parent_male'
  | 'parent_female'
  | 'parent_opa'
  | 'child_boy_teen'
  | 'child_boy_young'
  | 'child_girl_teen'
  | 'child_girl_young'
  | 'unavailable'

/** Pro Alters-/Rollen-Kategorie wählbare Portrait-Stämme (_1 = Happy-Basis). */
export const PORTRAIT_OPTIONS_BY_CATEGORY: Record<Exclude<MemberAvatarCategory, 'unavailable'>, AvatarPortraitId[]> = {
  parent_male: ['Mann_1_1', 'Mann_1_1b', 'Mann_2_1', 'Mann_2_1b', 'Mann_3_1'],
  parent_female: ['Frau_1_1', 'Frau_1_1b', 'Frau_2_1', 'Frau_2_1b'],
  parent_opa: ['Opa_1_1', 'Opa_2_1'],
  child_boy_teen: ['Junge_1_1', 'Junge_3_1'],
  child_boy_young: ['Junge_2_1', 'Junge_4_1'],
  child_girl_teen: ['Mädchen_1_1', 'Mädchen_3_1'],
  child_girl_young: ['Mädchen_2_1', 'Mädchen_4_1'],
}

const PORTRAIT_ID_PATTERN = /^(Mann|Frau|Junge|Mädchen|Opa|Oma)_\d+_\d+t?$/
const PORTRAIT_ID_PARTS_PATTERN = /^(Mann|Frau|Junge|Mädchen|Opa|Oma)_(\d+)_(\d+)(t?)$/

/** Alternativer Mann_1-Start (anderer Beruf) — Stufe _2 … _4 wie Mann_1_1. */
export const MANN_1_ALT_START_PORTRAIT_ID = 'Mann_1_1b' as const
/** Alternativer Mann_2-Start — Stufe _2 … _4 wie Mann_2_1. */
export const MANN_2_ALT_START_PORTRAIT_ID = 'Mann_2_1b' as const
/** Alternativer Frau_1-Start — Stufe _2 … _4 wie Frau_1_1. */
export const FRAU_1_ALT_START_PORTRAIT_ID = 'Frau_1_1b' as const
/** Alternativer Frau_2-Start — Stufe _2 … _4 wie Frau_2_1. */
export const FRAU_2_ALT_START_PORTRAIT_ID = 'Frau_2_1b' as const
export const OPA_1_START_PORTRAIT_ID = 'Opa_1_1' as const

const ALT_START_PORTRAIT_IDS = new Set<AvatarPortraitId>([
  MANN_1_ALT_START_PORTRAIT_ID,
  MANN_2_ALT_START_PORTRAIT_ID,
  FRAU_1_ALT_START_PORTRAIT_ID,
  FRAU_2_ALT_START_PORTRAIT_ID,
])

const PARENT_MALE_PORTRAIT_OPTIONS: readonly AvatarPortraitId[] = [
  'Mann_1_1',
  MANN_1_ALT_START_PORTRAIT_ID,
  'Mann_2_1',
  MANN_2_ALT_START_PORTRAIT_ID,
  'Mann_3_1',
]

const PARENT_FEMALE_PORTRAIT_OPTIONS: readonly AvatarPortraitId[] = [
  'Frau_1_1',
  FRAU_1_ALT_START_PORTRAIT_ID,
  'Frau_2_1',
  FRAU_2_ALT_START_PORTRAIT_ID,
]

const PARENT_OPA_PORTRAIT_OPTIONS: readonly AvatarPortraitId[] = ['Opa_1_1', 'Opa_2_1']

/** Vorhandene Dateien unter /public/avatars/ — via `npm run optimize:avatars` synchronisiert. */
export const AVAILABLE_PORTRAIT_IDS = new Set<AvatarPortraitId>([
  'Frau_1_1',
  'Frau_1_1b',
  'Frau_1_2',
  'Frau_1_3',
  'Frau_1_4',
  'Frau_2_1',
  'Frau_2_1b',
  'Frau_2_2',
  'Frau_2_3',
  'Frau_2_4',
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
  'Junge_3_2',
  'Junge_3_3',
  'Junge_3_4',
  'Junge_4_1',
  'Mann_1_1',
  'Mann_1_1b',
  'Mann_1_2',
  'Mann_1_3',
  'Mann_1_4',
  'Mann_2_1',
  'Mann_2_1b',
  'Mann_2_2',
  'Mann_2_3',
  'Mann_2_4',
  'Mann_3_1',
  'Mann_3_2',
  'Mann_3_3',
  'Mann_3_4',
  'Opa_1_1',
  'Opa_1_2',
  'Opa_2_1',
  'Opa_2_2',
  'Mädchen_1_1',
  'Mädchen_1_2',
  'Mädchen_1_3',
  'Mädchen_1_4',
  'Mädchen_1_5',
  'Mädchen_1_6',
  'Mädchen_2_1',
  'Mädchen_2_2',
  'Mädchen_2_3',
  'Mädchen_2_4',
  'Mädchen_3_1',
  'Mädchen_4_1',
])

export function isPortraitId(value: string): boolean {
  return PORTRAIT_ID_PATTERN.test(value) || ALT_START_PORTRAIT_IDS.has(value)
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

type PortraitXpBase = {
  stem: string
  tier1PortraitId: AvatarPortraitId
  suffix: string
}

/** Mann_1_1b / Mann_2_1b / Frau_1_1b / Frau_2_1b teilen XP-Stufen _2 … _N mit dem jeweiligen _1-Stamm. */
function portraitXpBase(portraitId: AvatarPortraitId): PortraitXpBase | null {
  if (portraitId === MANN_1_ALT_START_PORTRAIT_ID) {
    return { stem: 'Mann_1', tier1PortraitId: MANN_1_ALT_START_PORTRAIT_ID, suffix: '' }
  }
  if (portraitId === MANN_2_ALT_START_PORTRAIT_ID) {
    return { stem: 'Mann_2', tier1PortraitId: MANN_2_ALT_START_PORTRAIT_ID, suffix: '' }
  }
  if (portraitId === FRAU_1_ALT_START_PORTRAIT_ID) {
    return { stem: 'Frau_1', tier1PortraitId: FRAU_1_ALT_START_PORTRAIT_ID, suffix: '' }
  }
  if (portraitId === FRAU_2_ALT_START_PORTRAIT_ID) {
    return { stem: 'Frau_2', tier1PortraitId: FRAU_2_ALT_START_PORTRAIT_ID, suffix: '' }
  }
  const parsed = parsePortraitStem(portraitId)
  if (!parsed) return null
  return {
    stem: parsed.stem,
    tier1PortraitId: `${parsed.stem}_1${parsed.suffix}` as AvatarPortraitId,
    suffix: parsed.suffix,
  }
}

/** Gespeichertes Portrait (evtl. XP-Stufe) auf wählbare Basis-Option mappen. */
export function basePortraitOptionForOptions(
  portraitId: AvatarPortraitId | null | undefined,
  options: readonly AvatarPortraitId[],
): AvatarPortraitId | null {
  if (options.length === 0) return null
  if (portraitId && options.includes(portraitId)) return portraitId
  if (portraitId && ALT_START_PORTRAIT_IDS.has(portraitId) && options.includes(portraitId)) {
    return portraitId
  }
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

function maxPortraitTierForStem(stem: string, availableIds: ReadonlySet<string>): number {
  let max = 1
  for (let tier = 2; tier <= 6; tier++) {
    const plain = `${stem}_${tier}` as AvatarPortraitId
    const teen = `${stem}_${tier}t` as AvatarPortraitId
    if (availableIds.has(plain) || availableIds.has(teen)) max = tier
  }
  return max
}

/** Feste Stufenzahl pro Stamm — verhindert 2-Stufen-Fallback wenn nur _1/_2 erkannt werden. */
const PORTRAIT_STEM_MAX_TIER: Readonly<Record<string, number>> = {
  Junge_1: 6,
  Mädchen_1: 6,
  Mann_1: 4,
  Mann_2: 4,
  Mann_3: 4,
  Frau_1: 4,
  Frau_2: 4,
  Junge_2: 4,
  Junge_3: 4,
  Mädchen_2: 4,
  Opa_1: 2,
  Opa_2: 2,
}

function resolveMaxPortraitTier(stem: string, availableIds: ReadonlySet<string>): number {
  const detected = maxPortraitTierForStem(stem, availableIds)
  const expected = PORTRAIT_STEM_MAX_TIER[stem]
  if (expected === undefined) return detected
  return Math.max(detected, expected)
}

export function portraitIdForDailyXp(
  basePortraitId: AvatarPortraitId,
  todayXp: number,
  availableIds: ReadonlySet<string> = AVAILABLE_PORTRAIT_IDS,
): AvatarPortraitId {
  const xpBase = portraitXpBase(basePortraitId)
  if (!xpBase) return basePortraitId

  const { stem, tier1PortraitId, suffix } = xpBase
  const maxTier = resolveMaxPortraitTier(stem, availableIds)
  const targetTier = memberPortraitTierFromDailyXp(todayXp, maxTier)

  if (targetTier === 1 && availableIds.has(tier1PortraitId)) {
    return tier1PortraitId
  }

  for (let tier = targetTier; tier >= 2; tier--) {
    for (const candidate of portraitIdCandidates(stem, tier, suffix)) {
      if (availableIds.has(candidate)) return candidate
    }
  }

  return availableIds.has(tier1PortraitId) ? tier1PortraitId : basePortraitId
}

/** Alle Gesichts-Varianten (_1 … _N) eines Portrait-Stamms — für PLUS-Reaktionen. */
export function portraitExpressionVariantsForBase(
  basePortraitId: AvatarPortraitId,
  availableIds: ReadonlySet<string> = AVAILABLE_PORTRAIT_IDS,
): AvatarPortraitId[] {
  const xpBase = portraitXpBase(basePortraitId)
  if (!xpBase) return availableIds.has(basePortraitId) ? [basePortraitId] : []

  const { stem, tier1PortraitId, suffix } = xpBase
  const maxTier = resolveMaxPortraitTier(stem, availableIds)
  const variants: AvatarPortraitId[] = []

  for (let tier = 1; tier <= maxTier; tier += 1) {
    for (const candidate of portraitIdCandidates(stem, tier, suffix)) {
      if (availableIds.has(candidate)) {
        variants.push(candidate)
        break
      }
    }
  }

  if (variants.length === 0 && availableIds.has(tier1PortraitId)) {
    return [tier1PortraitId]
  }

  return variants
}

export function portraitIdFromStored(value: string | null | undefined): AvatarPortraitId | null {
  if (!value || typeof value !== 'string') return null
  const raw = value
  if (isPortraitId(raw)) return raw
  if (ALT_START_PORTRAIT_IDS.has(raw)) return raw
  if (raw.startsWith(`${AVATAR_BASE}/`)) {
    const base = raw.slice(AVATAR_BASE.length + 1).replace(/\.webp$/i, '')
    if (ALT_START_PORTRAIT_IDS.has(base)) return base
    return isPortraitId(base) ? base : null
  }
  return null
}

export function maxPortraitTierForPortraitId(portraitId: string | null | undefined): number {
  if (!portraitId || !isPortraitId(portraitId as AvatarPortraitId)) {
    if (portraitId && ALT_START_PORTRAIT_IDS.has(portraitId)) {
      const xpBase = portraitXpBase(portraitId as AvatarPortraitId)
      if (xpBase) return resolveMaxPortraitTier(xpBase.stem, AVAILABLE_PORTRAIT_IDS)
    }
    return 6
  }
  const xpBase = portraitXpBase(portraitId as AvatarPortraitId)
  if (!xpBase) return 6
  return resolveMaxPortraitTier(xpBase.stem, AVAILABLE_PORTRAIT_IDS)
}

export function memberAvatarCategoryForParent(gender: ParentGender): MemberAvatarCategory {
  if (gender === 'female' || gender === 'oma') return 'parent_female'
  if (gender === 'opa') return 'parent_opa'
  return 'parent_male'
}

/** Opa: Opa 1 & 2 oben, darunter alle Papa-Portraits — Papa/Mama unverändert. */
export function portraitOptionGroupsForParent(
  gender: ParentGender,
): readonly (readonly AvatarPortraitId[])[] {
  if (gender === 'opa') {
    return [PARENT_OPA_PORTRAIT_OPTIONS, PARENT_MALE_PORTRAIT_OPTIONS]
  }
  if (gender === 'male') {
    return [PARENT_MALE_PORTRAIT_OPTIONS]
  }
  return [PARENT_FEMALE_PORTRAIT_OPTIONS]
}

export function portraitOptionsForParent(gender: ParentGender): AvatarPortraitId[] {
  return portraitOptionGroupsForParent(gender).flatMap((group) => [...group])
}

export function defaultPortraitForParent(gender: ParentGender): AvatarPortraitId | null {
  if (gender === 'female' || gender === 'oma') return 'Frau_2_1'
  if (gender === 'opa') return OPA_1_START_PORTRAIT_ID
  return portraitOptionGroupsForParent(gender)[0]?.[0] ?? null
}

function parentPortraitOptionGroupsUi(
  groups: readonly (readonly AvatarPortraitId[])[],
): readonly (readonly AvatarPortraitId[])[] | undefined {
  return groups.length > 1 ? groups : undefined
}

const CHILD_BOY_TEEN_PORTRAITS: readonly AvatarPortraitId[] = ['Junge_1_1', 'Junge_3_1']
const CHILD_BOY_YOUNG_PORTRAITS: readonly AvatarPortraitId[] = ['Junge_2_1', 'Junge_4_1']
const CHILD_GIRL_TEEN_PORTRAITS: readonly AvatarPortraitId[] = ['Mädchen_1_1', 'Mädchen_3_1']
const CHILD_GIRL_YOUNG_PORTRAITS: readonly AvatarPortraitId[] = ['Mädchen_2_1', 'Mädchen_4_1']

function childPortraitAgeYears(age: number | null | undefined): number | null {
  if (age === null || age === undefined || !Number.isFinite(age)) return null
  return Math.floor(age)
}

/** Jungen & Mädchen: ab 9 Jahren Stämme 1 & 3 oben, 2 & 4 darunter — unter 9 umgekehrt. Alle vier wählbar. */
export function portraitOptionGroupsForChild(
  gender: ChildGender,
  age: number | null | undefined,
): readonly (readonly AvatarPortraitId[])[] {
  const teen = gender === 'boy' ? CHILD_BOY_TEEN_PORTRAITS : CHILD_GIRL_TEEN_PORTRAITS
  const young = gender === 'boy' ? CHILD_BOY_YOUNG_PORTRAITS : CHILD_GIRL_YOUNG_PORTRAITS
  const years = childPortraitAgeYears(age)
  const preferTeen = years === null ? true : years >= 9
  return preferTeen ? [teen, young] : [young, teen]
}

export function portraitOptionsForChild(
  gender: ChildGender,
  age: number | null | undefined,
): AvatarPortraitId[] {
  return portraitOptionGroupsForChild(gender, age).flatMap((group) => [...group])
}

export function defaultPortraitForChild(
  gender: ChildGender,
  age: number | null | undefined,
): AvatarPortraitId | null {
  return portraitOptionGroupsForChild(gender, age)[0]?.[0] ?? null
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
  /** Alters-/Opa-Gruppen: passende Portraits oben, weitere darunter — alle wählbar. */
  optionGroups?: readonly (readonly AvatarPortraitId[])[]
  error: string | null
}

/** Onboarding: Kinder ohne Alter — Eltern über portraitOptionsForParent. */
const ONBOARDING_CHILD_PORTRAIT_OPTIONS: Record<ChildGender, AvatarPortraitId[]> = {
  boy: ['Junge_1_1', 'Junge_2_1', 'Junge_3_1', 'Junge_4_1'],
  girl: ['Mädchen_1_1', 'Mädchen_2_1', 'Mädchen_3_1', 'Mädchen_4_1'],
}

function isParentPortraitGender(gender: OnboardingPortraitGender): gender is ParentGender {
  return gender === 'male' || gender === 'female' || gender === 'opa' || gender === 'oma'
}

export function portraitOptionsForOnboardingGender(gender: OnboardingPortraitGender): AvatarPortraitId[] {
  if (isParentPortraitGender(gender)) return portraitOptionsForParent(gender)
  return ONBOARDING_CHILD_PORTRAIT_OPTIONS[gender]
}

export function defaultOnboardingPortrait(gender: OnboardingPortraitGender): AvatarPortraitId {
  if (gender === 'female' || gender === 'oma') return 'Frau_2_1'
  if (gender === 'opa') return OPA_1_START_PORTRAIT_ID
  return portraitOptionsForOnboardingGender(gender)[0]
}

export function coerceOnboardingPortrait(
  gender: OnboardingPortraitGender,
  portraitId: AvatarPortraitId | null | undefined,
): AvatarPortraitId {
  const options = portraitOptionsForOnboardingGender(gender)
  const matched = basePortraitOptionForOptions(portraitId, options)
  if (matched) return matched
  if (gender === 'female' || gender === 'oma') return 'Frau_2_1'
  if (gender === 'opa') return OPA_1_START_PORTRAIT_ID
  return options[0]
}

export function resolveOnboardingAvatar(
  gender: OnboardingPortraitGender,
  portraitId: AvatarPortraitId | null | undefined,
): ResolvedMemberAvatar {
  const options = portraitOptionsForOnboardingGender(gender)
  const resolvedId = coerceOnboardingPortrait(gender, portraitId)
  const optionGroups = isParentPortraitGender(gender)
    ? parentPortraitOptionGroupsUi(portraitOptionGroupsForParent(gender))
    : undefined
  return {
    category: 'unavailable',
    portraitId: resolvedId,
    src: portraitSrc(resolvedId),
    options,
    optionGroups,
    error: null,
  }
}

/** Kind-Formular: Onboarding-Avatar bis Alter vollständig, dann altersgerechtes Portrait (ab 2 Jahren). */
export function resolveChildAvatarWhileEditing(
  gender: ChildGender,
  ageInput: string,
  portraitId: AvatarPortraitId | null | undefined,
  ageInputCommitted = false,
): ResolvedMemberAvatar {
  const complete = isAgeInputCompleteForAvatar(ageInput) || ageInputCommitted
  if (!complete) return resolveOnboardingAvatar(gender, portraitId)

  const age = parseAgeInput(ageInput)
  if (age === null || age < 2) return resolveOnboardingAvatar(gender, portraitId)

  return resolveChildAvatar(gender, age, portraitId)
}

export function shouldSyncChildPortraitForAgeInput(ageInput: string, ageInputCommitted = false): boolean {
  if (!isAgeInputCompleteForAvatar(ageInput) && !ageInputCommitted) return false
  const age = parseAgeInput(ageInput)
  return age !== null && age >= 2
}

export function resolveParentAvatar(
  gender: ParentGender,
  storedAvatarUrl: string | null | undefined,
  resolveOptions?: ResolveMemberAvatarOptions,
): ResolvedMemberAvatar {
  const category = memberAvatarCategoryForParent(gender)
  const optionGroups = portraitOptionGroupsForParent(gender)
  const options = portraitOptionsForParent(gender)
  const stored = portraitIdFromStored(storedAvatarUrl)
  let portraitId =
    basePortraitOptionForOptions(stored, options) ?? defaultPortraitForParent(gender)

  if (portraitId && resolveOptions?.todayXp !== undefined) {
    portraitId = portraitIdForDailyXp(portraitId, resolveOptions.todayXp)
  }

  return {
    category,
    portraitId,
    src: portraitId ? portraitSrc(portraitId) : null,
    options,
    optionGroups: parentPortraitOptionGroupsUi(optionGroups),
    error: null,
  }
}

export function resolveChildAvatar(
  gender: ChildGender,
  age: number | null | undefined,
  storedPortraitId: string | null | undefined,
  resolveOptions?: ResolveMemberAvatarOptions,
): ResolvedMemberAvatar {
  const years = childPortraitAgeYears(age)
  const category = memberAvatarCategoryForChild(gender, age)

  if (years === null) {
    return {
      category: 'unavailable',
      portraitId: null,
      src: null,
      options: [],
      error: 'Bitte Alter angeben für ein Portrait.',
    }
  }

  if (years < 2) {
    return {
      category: 'unavailable',
      portraitId: null,
      src: null,
      options: [],
      error: null,
    }
  }

  const optionGroups = portraitOptionGroupsForChild(gender, age)
  const options = portraitOptionsForChild(gender, age)
  const stored = portraitIdFromStored(storedPortraitId)
  let portraitId =
    basePortraitOptionForOptions(stored, options) ?? defaultPortraitForChild(gender, age)

  if (portraitId && resolveOptions?.todayXp !== undefined) {
    portraitId = portraitIdForDailyXp(portraitId, resolveOptions.todayXp)
  }

  return {
    category,
    portraitId,
    src: portraitId ? portraitSrc(portraitId) : null,
    options,
    optionGroups,
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
