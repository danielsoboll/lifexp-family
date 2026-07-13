import { HOME_PATH } from './legalRoutes'
import {
  getStoredMemberKind,
  resetLifeXpFamilyClientState,
  type FamilySessionMemberKind,
} from './familySession'

export const APP_ERROR_EVENT = 'lifexp-app-error'

export const STUCK_LOADING_MS = 12_000
export const STUCK_BUSY_MS = 15_000
export const NOTBREMSE_AUTO_ESCAPE_MS = 2_000

export type AppErrorSource = 'unhandled' | 'error-boundary' | 'app' | 'loading-timeout' | 'busy-timeout'

export type AppErrorDetail = {
  message: string
  source: AppErrorSource
}

/** Kinder-UI: nur ein Button, kein „Hier bleiben“, keine Details. */
export function isChildNotbremseAudience(memberKind?: FamilySessionMemberKind | null): boolean {
  if (memberKind === 'parent') return false
  if (memberKind === 'child') return true
  return getStoredMemberKind() !== 'parent'
}

export function reportAppError(message: string, source: AppErrorSource = 'app') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<AppErrorDetail>(APP_ERROR_EVENT, {
      detail: { message, source },
    }),
  )
}

/** Session löschen und Willkommens-Startseite per Hard-Reload — funktioniert auch wenn man schon auf / ist. */
export function escapeToWelcomeHome() {
  if (typeof window === 'undefined') return

  try {
    resetLifeXpFamilyClientState()
  } catch {
    /* trotzdem weiter zur Startseite */
  }

  window.location.assign(HOME_PATH)
}
