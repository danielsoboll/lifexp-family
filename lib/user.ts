import { syncDailyScoresBackfillForStreak } from './dailyScores'
import { reconcileProfileStreakDaysIfBehind } from './streakDays'
import {
  clearBridgedStorage,
  loadBridgedStorage,
  saveBridgedStorage,
} from './lifeexpCookie'
import { supabase } from './supabase'

export const LIFEXP_USERNAME_KEY = 'lifexp_username'
const USERNAME_COOKIE_KEY = 'lifexp_u'

/** Profil in Supabase angelegt — Session bleibt nach App-Kill (Cookie + localStorage). */
export const LIFEXP_SESSION_ESTABLISHED_KEY = 'lifexp_session_established'
const SESSION_ESTABLISHED_COOKIE_KEY = 'lifexp_se'
const SESSION_ESTABLISHED_VALUE = '1'

/** Session-only: Profil-Override (z. B. „dan“), localStorage bleibt unverändert. */
const PROFILE_OVERRIDE_SESSION_KEY = 'lifexp_profile_username_override'

export const DAN_PROFILE_USERNAME = 'dan'

export const LIFEXP_ACTIVE_USER_CHANGED_EVENT = 'lifexp-active-user-changed'

/** Einheitliche Speicherung/Lookup (kleingeschrieben, getrimmt). */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function getStoredUsername(): string | null {
  if (typeof window === 'undefined') return null
  const raw = loadBridgedStorage(LIFEXP_USERNAME_KEY, USERNAME_COOKIE_KEY)?.trim()
  return raw ? normalizeUsername(raw) : null
}

export function setStoredUsername(username: string) {
  if (typeof window === 'undefined') return
  const normalized = normalizeUsername(username)
  saveBridgedStorage(LIFEXP_USERNAME_KEY, USERNAME_COOKIE_KEY, normalized)
}

export function clearStoredUsername() {
  if (typeof window === 'undefined') return
  clearBridgedStorage(LIFEXP_USERNAME_KEY, USERNAME_COOKIE_KEY)
}

export function hasEstablishedSession(): boolean {
  if (typeof window === 'undefined') return false
  return (
    loadBridgedStorage(LIFEXP_SESSION_ESTABLISHED_KEY, SESSION_ESTABLISHED_COOKIE_KEY) ===
    SESSION_ESTABLISHED_VALUE
  )
}

export function markSessionEstablished(): void {
  if (typeof window === 'undefined') return
  saveBridgedStorage(
    LIFEXP_SESSION_ESTABLISHED_KEY,
    SESSION_ESTABLISHED_COOKIE_KEY,
    SESSION_ESTABLISHED_VALUE,
  )
}

export function clearEstablishedSession(): void {
  if (typeof window === 'undefined') return
  clearBridgedStorage(LIFEXP_SESSION_ESTABLISHED_KEY, SESSION_ESTABLISHED_COOKIE_KEY)
}

export function getProfileUsernameOverride(): string | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(PROFILE_OVERRIDE_SESSION_KEY)?.trim()
  return raw ? normalizeUsername(raw) : null
}

export function isDanProfileOverrideActive(): boolean {
  return getProfileUsernameOverride() === DAN_PROFILE_USERNAME
}

/** Dev-Account (z. B. dantest1) — Dan-Einloggen in Ziele nur für diese Nutzer. */
export function isDantestDevAccount(): boolean {
  const username = getStoredUsername()
  return username != null && username.startsWith('dantest')
}

/** „Dan einloggen“ nur für dantest*; „Dan ausloggen“ solange Dan-Session aktiv. */
export function canShowDanProfileDevLogin(): boolean {
  return isDanProfileOverrideActive() || isDantestDevAccount()
}

function notifyActiveUserChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LIFEXP_ACTIVE_USER_CHANGED_EVENT))
}

/** Dan-Profil aus Supabase laden und nur für diese Session aktivieren. */
export async function loginAsDanProfile(): Promise<{ error: Error | null }> {
  const username = DAN_PROFILE_USERNAME
  const { data, error } = await supabase.from('profiles').select('username').eq('username', username).maybeSingle()

  if (error) {
    return { error: new Error(error.message) }
  }
  if (!data) {
    return { error: new Error('Profil „dan“ wurde in Supabase nicht gefunden.') }
  }

  if (typeof window !== 'undefined') {
    sessionStorage.setItem(PROFILE_OVERRIDE_SESSION_KEY, username)
    notifyActiveUserChanged()
  }

  const { error: dailyScoreError } = await syncDailyScoresBackfillForStreak()
  if (dailyScoreError) {
    return { error: dailyScoreError }
  }

  const { error: streakError } = await reconcileProfileStreakDaysIfBehind()
  if (streakError) {
    return { error: streakError }
  }

  return { error: null }
}

/** Session-Override beenden – weiter mit dem Benutzer aus localStorage. */
export function logoutDanProfile(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PROFILE_OVERRIDE_SESSION_KEY)
  notifyActiveUserChanged()
}

/** Aktives Profil: zuerst Session-Override, sonst localStorage. */
export function getActiveUsername(): string | null {
  return getProfileUsernameOverride() ?? getStoredUsername()
}

/** Lokale Ziele/XP nicht überschreiben, solange ein anderes Profil per Session aktiv ist. */
export function shouldPersistLocalProfilePrefs(): boolean {
  return !getProfileUsernameOverride()
}

export function requireActiveUsername(): string {
  const username = getActiveUsername()
  if (!username) {
    throw new Error('Kein Benutzer. Bitte Onboarding abschließen.')
  }
  return username
}

/** Für xp_events / meal_entries (`user_id`-Spalte = username). */
export function getActiveUserId(): string | null {
  return getActiveUsername()
}
