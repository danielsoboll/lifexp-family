import { bootstrapClientStorageFromCookies } from './clientStorageBootstrap'
import { clearOnboardingDraft, hasIncompleteOnboardingDraft } from './onboardingDraft'
import { runProductionDomainFreshStartIfNeeded } from './productionDomainFreshStart'
import { fetchProfileByUsername } from './profile'
import {
  clearEstablishedSession,
  clearStoredUsername,
  getActiveUsername,
  getStoredUsername,
  hasEstablishedSession,
  markSessionEstablished,
} from './user'

export type OnboardingSessionMode = 'guest' | 'user'

export type ProfileConfirmOutcome = 'user' | 'guest' | 'offline'

/**
 * Nutzer nur als eingeloggt, wenn ein Profil in `profiles` existiert.
 * Ohne Profil: lokale Session-Daten löschen (verwaiste Cookies nach abgebrochenem Onboarding).
 */
export async function confirmActiveUserProfile(): Promise<ProfileConfirmOutcome> {
  const username = getActiveUsername() ?? getStoredUsername()
  if (!username) return 'guest'

  const { row, error } = await fetchProfileByUsername(username)
  if (!error && row) {
    markSessionEstablished()
    return 'user'
  }
  if (error) return 'offline'

  clearStoredUsername()
  clearEstablishedSession()
  return 'guest'
}

/**
 * Gast bei offenem Onboarding oder ohne bestätigtes Profil.
 * Bestehende Nutzer bleiben eingeloggt (Cookie/localStorage), offline nur mit etablierter Session.
 */
export async function resolveOnboardingSessionMode(): Promise<OnboardingSessionMode> {
  runProductionDomainFreshStartIfNeeded()
  bootstrapClientStorageFromCookies()

  const outcome = await confirmActiveUserProfile()

  if (outcome === 'user') {
    if (hasIncompleteOnboardingDraft()) {
      clearOnboardingDraft()
    }
    return 'user'
  }

  if (outcome === 'offline' && hasEstablishedSession()) {
    return 'user'
  }

  return 'guest'
}

/** Stale Draft löschen, wenn Profil schon angelegt (z. B. nach PWA-Wechsel). */
export async function reconcileIncompleteOnboardingDraft(): Promise<void> {
  if (!hasIncompleteOnboardingDraft()) return

  const username = getStoredUsername()
  if (!username) return

  const { row, error } = await fetchProfileByUsername(username)
  if (!error && row) {
    markSessionEstablished()
    clearOnboardingDraft()
  }
}
