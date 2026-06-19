import { clearKnowledgeRoundState } from './knowledgeRound'
import { clearOnboardingDraft } from './onboardingDraft'
import { resetCurrentProfileXp } from './profile'
import { resetAllXp } from './storage'
import { clearEstablishedSession, clearStoredUsername, getActiveUsername, getProfileUsernameOverride, getStoredUsername, logoutDanProfile, LIFEXP_ACTIVE_USER_CHANGED_EVENT } from './user'
import { deleteAllUserDataFromServer } from './userAccountDelete'
import { deleteAllDailyScoresForActiveUser } from './dailyScores'
import { deleteAllIndivFoodItemsForActiveUser } from './foodItemsIndiv'
import { deleteAllMealEntriesForActiveUser } from './nutrition'
import { deleteAllTasksForActiveUser } from './tasks'
import { clearWeekPlanDisplayAnchor } from './weekPlanAnchor'
import { deleteAllWeekPlanForActiveUser } from './weekPlan'
import { deleteAllXpEventsForActiveUser } from './xpEvents'

const LEGACY_USER_ID_KEY = 'lifexp_user_id'

/** Alle LifeXP-Einträge in localStorage/sessionStorage entfernen (Theme bleibt). */
export function clearAllLifeXpBrowserStorage() {
  if (typeof window === 'undefined') return

  const localKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    if (key.startsWith('lifexp') || key === 'points') {
      localKeys.push(key)
    }
  }
  for (const key of localKeys) {
    localStorage.removeItem(key)
  }

  const sessionKeys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (!key) continue
    if (key.startsWith('lifexp')) {
      sessionKeys.push(key)
    }
  }
  for (const key of sessionKeys) {
    sessionStorage.removeItem(key)
  }

  clearStoredUsername()
  clearEstablishedSession()
  clearWeekPlanDisplayAnchor()
  clearOnboardingDraft()
  localStorage.removeItem(LEGACY_USER_ID_KEY)
}

/**
 * „Alle XP zurücksetzen“: Historie (xp_events, meal_entries, daily_scores),
 * Profil-Stand (total_xp, Level, streak_days) und start_date auf heute.
 * Tasks, Wochenplan und food_items_indiv bleiben erhalten.
 */
export async function resetAllXpProgressData(): Promise<{ error: Error | null }> {
  if (!getActiveUsername()) {
    return { error: null }
  }

  const [
    { error: xpError },
    { error: mealError },
    { error: dailyScoresError },
    { error: profileError },
  ] = await Promise.all([
    deleteAllXpEventsForActiveUser(),
    deleteAllMealEntriesForActiveUser(),
    deleteAllDailyScoresForActiveUser(),
    resetCurrentProfileXp(),
  ])

  const firstError = xpError ?? mealError ?? dailyScoresError ?? profileError
  if (firstError) {
    return { error: firstError }
  }

  return { error: null }
}

/** Lokaler Cache + Fragen-Status (Wissen-Runde) nach Server-Reset leeren. */
export function clearLocalXpAndKnowledgeState() {
  clearKnowledgeRoundState()
  resetAllXp()
}

/** Benutzer löschen: Profil, gesamte Historie, Tasks, Wochenplan, Indiv-Lebensmittel. */
export async function resetAllUserAccountData(): Promise<{ error: Error | null }> {
  if (getProfileUsernameOverride() && !getStoredUsername()) {
    return {
      error: new Error('Bitte zuerst „Dan ausloggen“, dann erneut „Benutzer löschen“.'),
    }
  }

  const username = getStoredUsername() ?? getActiveUsername()
  if (username) {
    logoutDanProfile()
    const { error } = await deleteAllUserDataFromServer(username)
    if (error) return { error }
  }

  clearAllLifeXpBrowserStorage()
  clearLocalXpAndKnowledgeState()

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LIFEXP_ACTIVE_USER_CHANGED_EVENT))
  }

  return { error: null }
}
