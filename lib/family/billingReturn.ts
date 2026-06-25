import {
  bootstrapClientStorageFromCookies,
  mirrorBridgedStorageToCookies,
} from '../clientStorageBootstrap'
import { clearFamilyOnboardingDraft } from './onboardingDraft'
import {
  FAMILY_SESSION_CHANGED_EVENT,
  readFamilySession,
  type FamilySession,
} from '../familySession'

export const BILLING_RETURN_PATHS = ['/plus/success', '/plus/cancel'] as const

export const BILLING_SUCCESS_PATH = '/plus/success'
export const BILLING_CANCEL_PATH = '/plus/cancel'
export const BILLING_RETURN_TARGET_PATH = '/admin/settings'

export function isBillingReturnPath(pathname: string): boolean {
  return BILLING_RETURN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/** Nach externem Redirect (Stripe): Cookies → localStorage, Onboarding-Draft verwerfen. */
export function bootstrapFamilySessionAfterExternalRedirect(): FamilySession | null {
  bootstrapClientStorageFromCookies()
  mirrorBridgedStorageToCookies()
  const session = readFamilySession()
  if (session) {
    clearFamilyOnboardingDraft()
  }
  return session
}

export function notifyFamilySessionRestoredIfNeeded(
  storedSession: FamilySession | null,
  contextHasSession: boolean,
): void {
  if (storedSession && !contextHasSession && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FAMILY_SESSION_CHANGED_EVENT))
  }
}
