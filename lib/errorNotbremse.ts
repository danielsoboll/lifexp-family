import { HOME_PATH } from './legalRoutes'
import {
  getStoredMemberKind,
  hasFamilySession,
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

/** Nur navigieren — Session, Storage und Familie bleiben unverändert. */
export function escapeAfterAppCrash(currentPathname: string) {
  if (typeof window === 'undefined') return

  const path = currentPathname.split('?')[0] || HOME_PATH

  if (!hasFamilySession()) {
    window.location.assign(HOME_PATH)
    return
  }

  if (path !== HOME_PATH) {
    window.location.assign(HOME_PATH)
    return
  }

  window.location.reload()
}
