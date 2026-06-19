import { cetAddDays, cetToday, cetYesterday, normalizeDateKey } from './cetDate'
import { fetchCurrentProfile, type ProfileSettings } from './profile'
import { supabase } from './supabase'
import { getActiveUserId } from './user'

async function fetchLoginEventDates(userId: string): Promise<{ dates: Set<string>; error: Error | null }> {
  const { data, error } = await supabase
    .from('xp_events')
    .select('event_date')
    .eq('user_id', userId)
    .eq('category', 'plus')
    .eq('source', 'login')

  if (error) {
    return { dates: new Set(), error: new Error(error.message) }
  }

  const dates = new Set<string>()
  for (const row of Array.isArray(data) ? data : []) {
    const raw = (row as { event_date?: unknown }).event_date
    const key = normalizeDateKey(raw)
    if (key) dates.add(key)
  }
  return { dates, error: null }
}

function countConsecutiveLoginDays(loginDates: Set<string>, endDate: string): number {
  let count = 0
  let date = endDate
  for (let guard = 0; guard < 400; guard += 1) {
    if (!loginDates.has(date)) break
    count += 1
    date = cetAddDays(date, -1)
  }
  return count
}

/** Aktuelle Streak-Länge aus Login-Events (heute mitgezählt, falls schon „Bin dabei“). */
export function inferStreakDaysFromLoginDates(loginDates: Set<string>): number {
  const today = cetToday()
  if (loginDates.has(today)) {
    return countConsecutiveLoginDays(loginDates, today)
  }
  return countConsecutiveLoginDays(loginDates, cetYesterday())
}

export async function inferStreakDaysFromLoginHistory(userId: string): Promise<{
  streak: number
  error: Error | null
}> {
  const { dates, error } = await fetchLoginEventDates(userId)
  if (error) {
    return { streak: 0, error }
  }
  return { streak: inferStreakDaysFromLoginDates(dates), error: null }
}

function safeChallengeDay(
  requestedDay: number,
  profileDay: number,
  historyStreak: number,
): number {
  return Math.max(Math.floor(requestedDay), Math.max(profileDay, historyStreak))
}

async function writeChallengeDay(challengeDay: number): Promise<{ error: Error | null }> {
  const username = getActiveUserId()
  if (!username) {
    return { error: new Error('Kein Benutzer angemeldet.') }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ streak_days: Math.max(0, Math.floor(challengeDay)) })
    .eq('username', username)

  return { error: error ? new Error(error.message) : null }
}

/**
 * streak_days setzen — nie unter Profil-Stand oder Login-Historie absenken.
 */
export async function updateCurrentProfileChallengeDay(requestedDay: number): Promise<{
  challengeDay: number
  error: Error | null
}> {
  const userId = getActiveUserId()
  if (!userId) {
    return { challengeDay: 0, error: new Error('Kein Benutzer angemeldet.') }
  }

  const [{ settings, error: profileError }, { streak: historyStreak, error: historyError }] =
    await Promise.all([fetchCurrentProfile(), inferStreakDaysFromLoginHistory(userId)])

  if (profileError) {
    return { challengeDay: 0, error: profileError }
  }
  if (historyError) {
    return { challengeDay: settings.challengeDay, error: historyError }
  }

  const challengeDay = safeChallengeDay(requestedDay, settings.challengeDay, historyStreak)
  if (challengeDay === settings.challengeDay) {
    return { challengeDay, error: null }
  }

  const { error } = await writeChallengeDay(challengeDay)
  return { challengeDay, error }
}

/** Nach „Bin dabei!“ — frisch aus Profil + Historie, nicht aus veraltetem UI-State. */
export async function incrementProfileStreakDayAfterLogin(): Promise<{
  challengeDay: number
  error: Error | null
}> {
  const userId = getActiveUserId()
  if (!userId) {
    return { challengeDay: 0, error: new Error('Kein Benutzer angemeldet.') }
  }

  const [{ settings, error: profileError }, { dates, error: datesError }] = await Promise.all([
    fetchCurrentProfile(),
    fetchLoginEventDates(userId),
  ])

  if (profileError) {
    return { challengeDay: 0, error: profileError }
  }
  if (datesError) {
    return { challengeDay: settings.challengeDay, error: datesError }
  }

  const consecutiveBeforeToday = countConsecutiveLoginDays(dates, cetYesterday())
  const requestedDay = Math.max(settings.challengeDay + 1, consecutiveBeforeToday + 1)

  return updateCurrentProfileChallengeDay(requestedDay)
}

/**
 * Profil-Streak an Login-Historie angleichen (nur erhöhen).
 * z. B. nach Dan-Einloggen oder wenn streak_days hinter der Historie liegt.
 */
export async function reconcileProfileStreakDaysIfBehind(): Promise<{
  updated: boolean
  challengeDay: number
  error: Error | null
}> {
  const userId = getActiveUserId()
  if (!userId) {
    return { updated: false, challengeDay: 0, error: null }
  }

  const { settings, error: profileError } = await fetchCurrentProfile()
  if (profileError) {
    return { updated: false, challengeDay: 0, error: profileError }
  }

  const { streak, error: historyError } = await inferStreakDaysFromLoginHistory(userId)
  if (historyError) {
    return { updated: false, challengeDay: settings.challengeDay, error: historyError }
  }

  if (streak <= settings.challengeDay) {
    return { updated: false, challengeDay: settings.challengeDay, error: null }
  }

  const { challengeDay, error } = await updateCurrentProfileChallengeDay(streak)
  return { updated: challengeDay > settings.challengeDay, challengeDay, error }
}

/** Für Tests / Diagnose. */
export function streakFloorFromProfileAndHistory(
  profile: Pick<ProfileSettings, 'challengeDay'>,
  loginDates: Set<string>,
): number {
  return Math.max(profile.challengeDay, inferStreakDaysFromLoginDates(loginDates))
}
