import { cetToday, getLocalDateKey, normalizeDateKey } from './cetDate'
import { normalizeAvatarGender, type AvatarGender } from './avatarLibrary'
import { leagueTierFromDbValue, leagueTierToDbValue, type LigaTierId } from './liga'
import { getLevel } from './level'
import { normalizePrimaryGoal, normalizeProfileGender, type PrimaryGoal } from './goals'
import { deriveTypeCategory } from './typeCategory'
import { generateRecoveryCode, normalizeRecoveryCodeInput } from './recoveryCode'
import { getActiveUsername, normalizeUsername } from './user'
import { supabase } from './supabase'

export type ProfileSettings = {
  username: string
  age: number
  gender: string
  avatarGender: AvatarGender
  heightCm: number
  weightKg: number
  goalType: PrimaryGoal
  goalText: string
  alcoholMode: string
  /** null = Zielvorgaben (Motivation) noch nicht beantwortet */
  motivationMode: boolean | null
  alcoholLimitLow: number | null
  alcoholUnitLow: string
  alcoholTypeLow: string
  alcoholLimitHigh: number | null
  alcoholUnitHigh: string
  alcoholTypeHigh: string
  typeCategory: number
  challengeDay: number
  totalXp: number
  level: number
  league: LigaTierId
  leagueStand: number
  /** CET `YYYY-MM-DD` — Beginn der XP-Historie. */
  startDate: string
  /** PWA vom Home-Bildschirm / Standalone-Modus. */
  appInstalled: boolean
  /** „Später“ bei Install-Abfrage (Ziele / Overlay, nicht Onboarding). */
  appLater: boolean
  /** Account-Wiederherstellung (LIFE-XXXX-XXXX). */
  recCode: string
  /** Nutzer hat Recovery-Code gespeichert bestätigt. */
  recCodeOk: boolean
}

/** Supabase `profiles` – snake_case-Spalten (height_cm, nicht heigth_cm). */
const PROFILE_FIELD = {
  username: 'username',
  age: 'age',
  gender: 'gender',
  avatarGender: 'avatar_gender',
  heightCm: 'height_cm',
  weightKg: 'weight_kg',
  goalType: 'goal_type',
  goalText: 'goal_text',
  typeCategory: 'type_category',
  totalXp: 'total_xp',
  currentLevel: 'current_level',
  streakDays: 'streak_days',
  alcoholMode: 'alcohol_mode',
  motivationMode: 'motivation_mode',
  alcoholLimitLow: 'alcohol_limit_low',
  alcoholUnitLow: 'alcohol_unit_low',
  alcoholTypeLow: 'alcohol_type_low',
  alcoholLimitHigh: 'alcohol_limit_high',
  alcoholUnitHigh: 'alcohol_unit_high',
  alcoholTypeHigh: 'alcohol_type_high',
  league: 'league',
  leagueStand: 'league_stand',
  startDate: 'start_date',
  appInstalled: 'app_installed',
  appLater: 'app_later',
  recCode: 'rec_code',
  recCodeOk: 'rec_code_ok',
  createdAt: 'created_at',
} as const

const PROFILE_COLUMNS = Object.values(PROFILE_FIELD).join(',')

export type GuestProfileInput = {
  username: string
  age: number
  gender: string
  avatarGender: AvatarGender
  heightCm: number
  weightKg: number
  goalType: PrimaryGoal
  goalText?: string
}

type ProfileRow = Record<string, unknown>

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value)
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function dateOnlyFromProfile(value: unknown): string {
  const fromKey = normalizeDateKey(value)
  if (fromKey) return fromKey
  const raw = textValue(value)
  if (!raw) return ''
  const parsed = Date.parse(raw)
  if (Number.isFinite(parsed)) return getLocalDateKey(parsed)
  return ''
}

function optionalNumberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'))
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export const LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT = 'lifexp-profile-settings-changed'

export function notifyProfileSettingsChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LIFEXP_PROFILE_SETTINGS_CHANGED_EVENT))
}

export function isAlcoholTrackingEnabled(alcoholMode: string): boolean {
  const raw = alcoholMode.trim().toLowerCase()
  return raw === 'yes' || raw === 'true' || raw === '1' || raw === 'ja'
}

function clearAlcoholLimitsPatch(): Record<string, null> {
  return {
    [PROFILE_FIELD.alcoholLimitLow]: null,
    [PROFILE_FIELD.alcoholUnitLow]: null,
    [PROFILE_FIELD.alcoholTypeLow]: null,
    [PROFILE_FIELD.alcoholLimitHigh]: null,
    [PROFILE_FIELD.alcoholUnitHigh]: null,
    [PROFILE_FIELD.alcoholTypeHigh]: null,
  }
}

function primaryGoalFromProfile(value: unknown): PrimaryGoal {
  return normalizePrimaryGoal(value)
}

function booleanModeFromProfile(value: unknown): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value
  const raw = textValue(value).toLowerCase()
  if (raw === 'yes' || raw === 'true' || raw === '1' || raw === 'ja') return true
  if (raw === 'no' || raw === 'false' || raw === '0' || raw === 'nein') return false
  return null
}

function booleanFromProfile(value: unknown): boolean {
  if (value === true) return true
  if (value === false) return false
  const raw = textValue(value).toLowerCase()
  return raw === 'yes' || raw === 'true' || raw === '1' || raw === 'ja'
}

function settingsFromRow(row: ProfileRow | null): ProfileSettings {
  const totalXp = numberValue(row?.total_xp)
  const levelFromProfile = numberValue(row?.current_level ?? row?.level)
  const alcoholModeRaw = row?.alcohol_mode
  const alcoholMode =
    typeof alcoholModeRaw === 'boolean' ? (alcoholModeRaw ? 'yes' : 'no') : textValue(alcoholModeRaw).toLowerCase()
  return {
    username: textValue(row?.username),
    age: numberValue(row?.age),
    gender: normalizeProfileGender(row?.gender),
    avatarGender: normalizeAvatarGender(row?.[PROFILE_FIELD.avatarGender]),
    heightCm: numberValue(row?.[PROFILE_FIELD.heightCm] ?? row?.heigth_cm),
    weightKg: numberValue(row?.[PROFILE_FIELD.weightKg]),
    goalType: primaryGoalFromProfile(row?.[PROFILE_FIELD.goalType]),
    goalText: textValue(row?.[PROFILE_FIELD.goalText]),
    alcoholMode: alcoholMode || 'all',
    motivationMode: booleanModeFromProfile(
      row?.[PROFILE_FIELD.motivationMode] ?? row?.motiv_mode,
    ),
    alcoholLimitLow: optionalNumberValue(row?.[PROFILE_FIELD.alcoholLimitLow]),
    alcoholUnitLow: textValue(row?.[PROFILE_FIELD.alcoholUnitLow]),
    alcoholTypeLow: textValue(row?.[PROFILE_FIELD.alcoholTypeLow]),
    alcoholLimitHigh: optionalNumberValue(row?.[PROFILE_FIELD.alcoholLimitHigh]),
    alcoholUnitHigh: textValue(row?.[PROFILE_FIELD.alcoholUnitHigh]),
    alcoholTypeHigh: textValue(row?.[PROFILE_FIELD.alcoholTypeHigh]),
    typeCategory: numberValue(row?.[PROFILE_FIELD.typeCategory]) || 1,
    challengeDay: numberValue(row?.[PROFILE_FIELD.streakDays]),
    totalXp,
    level: levelFromProfile > 0 ? levelFromProfile : getLevel(totalXp),
    league: leagueTierFromDbValue(row?.[PROFILE_FIELD.league]),
    leagueStand: Math.max(0, numberValue(row?.[PROFILE_FIELD.leagueStand])),
    startDate:
      dateOnlyFromProfile(row?.[PROFILE_FIELD.startDate]) ||
      dateOnlyFromProfile(row?.[PROFILE_FIELD.createdAt]) ||
      cetToday(),
    appInstalled: booleanFromProfile(row?.[PROFILE_FIELD.appInstalled]),
    appLater: booleanFromProfile(row?.[PROFILE_FIELD.appLater]),
    recCode: textValue(row?.[PROFILE_FIELD.recCode]),
    recCodeOk: booleanFromProfile(row?.[PROFILE_FIELD.recCodeOk]),
  }
}

export async function fetchProfileByUsername(username: string): Promise<{
  row: ProfileRow | null
  settings: ProfileSettings
  error: Error | null
}> {
  const key = normalizeUsername(username)
  if (!key) {
    return { row: null, settings: settingsFromRow(null), error: null }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq(PROFILE_FIELD.username, key)
    .maybeSingle()

  if (error) {
    return { row: null, settings: settingsFromRow(null), error: new Error(error.message) }
  }

  const row = data && typeof data === 'object' ? (data as ProfileRow) : null
  return { row, settings: settingsFromRow(row), error: null }
}

export async function fetchProfileByRecoveryCode(code: string): Promise<{
  row: ProfileRow | null
  settings: ProfileSettings
  error: Error | null
}> {
  const normalized = normalizeRecoveryCodeInput(code)
  if (!normalized) {
    return { row: null, settings: settingsFromRow(null), error: null }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq(PROFILE_FIELD.recCode, normalized)
    .maybeSingle()

  if (error) {
    return { row: null, settings: settingsFromRow(null), error: new Error(error.message) }
  }

  const row = data && typeof data === 'object' ? (data as ProfileRow) : null
  return { row, settings: settingsFromRow(row), error: null }
}

export async function fetchCurrentProfile(): Promise<{
  row: ProfileRow | null
  settings: ProfileSettings
  error: Error | null
}> {
  const username = getActiveUsername()
  if (!username) {
    return { row: null, settings: settingsFromRow(null), error: null }
  }
  return fetchProfileByUsername(username)
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username)
  if (!normalized) return false
  const { row } = await fetchProfileByUsername(normalized)
  return !row
}

export async function createGuestProfile(
  input: GuestProfileInput,
): Promise<{ error: Error | null; usernameTaken?: boolean; recoveryCode?: string }> {
  const username = normalizeUsername(input.username)
  if (!username) {
    return { error: new Error('Bitte einen gültigen Benutzernamen eingeben.') }
  }

  const available = await isUsernameAvailable(username)
  if (!available) {
    return {
      error: new Error('Dieser Benutzername ist bereits vergeben.'),
      usernameTaken: true,
    }
  }

  const typeCategory = deriveTypeCategory(input.gender, input.weightKg, input.goalType)

  let recoveryCode = generateRecoveryCode()
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { row } = await fetchProfileByRecoveryCode(recoveryCode)
    if (!row) break
    recoveryCode = generateRecoveryCode()
  }

  const { error } = await supabase.from('profiles').insert({
    [PROFILE_FIELD.username]: username,
    [PROFILE_FIELD.age]: Math.max(10, Math.min(120, Math.floor(input.age))),
    [PROFILE_FIELD.gender]: input.gender.trim().toLowerCase(),
    [PROFILE_FIELD.avatarGender]: input.avatarGender,
    [PROFILE_FIELD.heightCm]: Math.max(100, Math.min(250, Math.floor(input.heightCm))),
    [PROFILE_FIELD.weightKg]: Math.max(30, Math.min(300, Math.floor(input.weightKg))),
    [PROFILE_FIELD.goalType]: input.goalType,
    [PROFILE_FIELD.goalText]: textValue(input.goalText),
    [PROFILE_FIELD.typeCategory]: typeCategory,
    [PROFILE_FIELD.totalXp]: 0,
    [PROFILE_FIELD.currentLevel]: 1,
    [PROFILE_FIELD.streakDays]: 0,
    [PROFILE_FIELD.alcoholMode]: false,
    [PROFILE_FIELD.league]: leagueTierToDbValue('recruit'),
    [PROFILE_FIELD.leagueStand]: 0,
    [PROFILE_FIELD.startDate]: cetToday(),
    [PROFILE_FIELD.appInstalled]: false,
    [PROFILE_FIELD.appLater]: false,
    [PROFILE_FIELD.recCode]: recoveryCode,
    [PROFILE_FIELD.recCodeOk]: false,
  })

  return { error: error ? new Error(error.message) : null, recoveryCode }
}

async function updateProfileForActiveUser(
  patch: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  const username = getActiveUsername()
  if (!username) return { error: new Error('Kein Benutzer angemeldet.') }

  const { error } = await supabase.from('profiles').update(patch).eq(PROFILE_FIELD.username, username)
  return { error: error ? new Error(error.message) : null }
}

export async function updateCurrentProfileXp(totalXp: number): Promise<{ error: Error | null }> {
  return updateProfileForActiveUser({
    [PROFILE_FIELD.totalXp]: Math.max(0, Math.floor(totalXp)),
    [PROFILE_FIELD.currentLevel]: getLevel(totalXp),
  })
}

export async function resetCurrentProfileXp(): Promise<{ error: Error | null }> {
  return updateProfileForActiveUser({
    [PROFILE_FIELD.totalXp]: 0,
    [PROFILE_FIELD.currentLevel]: 1,
    [PROFILE_FIELD.streakDays]: 0,
    [PROFILE_FIELD.league]: leagueTierToDbValue('recruit'),
    [PROFILE_FIELD.leagueStand]: 0,
    [PROFILE_FIELD.startDate]: cetToday(),
  })
}

export async function updateCurrentLeague(
  league: LigaTierId,
  leagueStand: number,
): Promise<{ error: Error | null }> {
  return updateProfileForActiveUser({
    [PROFILE_FIELD.league]: leagueTierToDbValue(league),
    [PROFILE_FIELD.leagueStand]: Math.max(0, Math.floor(leagueStand)),
  })
}

export { updateCurrentProfileChallengeDay, incrementProfileStreakDayAfterLogin, reconcileProfileStreakDaysIfBehind } from './streakDays'

export async function updateCurrentProfileGoal(goalType: PrimaryGoal): Promise<{ error: Error | null }> {
  return updateProfileForActiveUser({ [PROFILE_FIELD.goalType]: goalType })
}

export async function updateCurrentProfileGoalText(goalText: string): Promise<{ error: Error | null }> {
  return updateProfileForActiveUser({ [PROFILE_FIELD.goalText]: textValue(goalText) })
}

export async function updateCurrentProfileAvatarGender(
  avatarGender: AvatarGender,
): Promise<{ error: Error | null }> {
  const result = await updateProfileForActiveUser({ [PROFILE_FIELD.avatarGender]: avatarGender })
  if (!result.error) notifyProfileSettingsChanged()
  return result
}

export async function updateCurrentProfileAppInstalled(
  installed: boolean,
): Promise<{ error: Error | null }> {
  const result = await updateProfileForActiveUser({
    [PROFILE_FIELD.appInstalled]: installed,
  })
  if (!result.error) notifyProfileSettingsChanged()
  return result
}

export async function updateCurrentProfileAppLater(
  later: boolean,
): Promise<{ error: Error | null }> {
  const result = await updateProfileForActiveUser({
    [PROFILE_FIELD.appLater]: later,
  })
  if (!result.error) notifyProfileSettingsChanged()
  return result
}

export async function updateCurrentProfileRecCodeOk(ok: boolean): Promise<{ error: Error | null }> {
  const result = await updateProfileForActiveUser({
    [PROFILE_FIELD.recCodeOk]: ok,
  })
  if (!result.error) notifyProfileSettingsChanged()
  return result
}

export type AlcoholLimitsPatch = {
  limitLow: number
  unitLow: string
  typeLow: string
  limitHigh: number
  unitHigh: string
  typeHigh: string
}

/** Sofort speichern, wenn „Alkohol mit tracken?“ auf Ja/Nein gestellt wird. */
export async function updateCurrentProfileAlcoholTracking(
  alcoholTrack: boolean,
): Promise<{ error: Error | null }> {
  const patch: Record<string, unknown> = {
    [PROFILE_FIELD.alcoholMode]: alcoholTrack,
    ...(alcoholTrack ? {} : clearAlcoholLimitsPatch()),
  }
  const result = await updateProfileForActiveUser(patch)
  if (!result.error) notifyProfileSettingsChanged()
  return result
}

export async function updateCurrentProfileZielvorgaben({
  alcoholTrack,
  motivationDaily,
  alcoholLimits,
}: {
  alcoholTrack: boolean
  motivationDaily: boolean
  alcoholLimits?: AlcoholLimitsPatch | null
}): Promise<{ error: Error | null }> {
  const patch: Record<string, unknown> = {
    [PROFILE_FIELD.alcoholMode]: alcoholTrack,
    [PROFILE_FIELD.motivationMode]: motivationDaily,
  }

  if (alcoholTrack && alcoholLimits) {
    patch[PROFILE_FIELD.alcoholLimitLow] = alcoholLimits.limitLow
    patch[PROFILE_FIELD.alcoholUnitLow] = alcoholLimits.unitLow
    patch[PROFILE_FIELD.alcoholTypeLow] = alcoholLimits.typeLow
    patch[PROFILE_FIELD.alcoholLimitHigh] = alcoholLimits.limitHigh
    patch[PROFILE_FIELD.alcoholUnitHigh] = alcoholLimits.unitHigh
    patch[PROFILE_FIELD.alcoholTypeHigh] = alcoholLimits.typeHigh
  } else if (!alcoholTrack) {
    Object.assign(patch, clearAlcoholLimitsPatch())
  }

  const result = await updateProfileForActiveUser(patch)
  if (!result.error) notifyProfileSettingsChanged()
  return result
}

export async function deleteCurrentUserProfile(): Promise<{ error: Error | null }> {
  const { getStoredUsername } = await import('./user')
  const username = getStoredUsername()
  if (!username) return { error: null }

  const { deleteAllUserDataFromServer } = await import('./userAccountDelete')
  return deleteAllUserDataFromServer(username)
}
