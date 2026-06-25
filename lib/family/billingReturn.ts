import {
  bootstrapClientStorageFromCookies,
  mirrorBridgedStorageToCookies,
} from '../clientStorageBootstrap'
import { getBridgedCookie, setBridgedCookie, clearBridgedCookie } from '../bridgedStorage'
import { clearFamilyOnboardingDraft } from './onboardingDraft'
import {
  FAMILY_SESSION_CHANGED_EVENT,
  readFamilySession,
  storeFamilySession,
  type FamilySession,
  type FamilySessionMemberKind,
} from '../familySession'

export const BILLING_RETURN_PATHS = ['/plus/success', '/plus/cancel'] as const

export const BILLING_SUCCESS_PATH = '/plus/success'
export const BILLING_CANCEL_PATH = '/plus/cancel'
export const BILLING_RETURN_TARGET_PATH = '/admin/settings'

export const BILLING_RETURN_SESSION_KEY = 'lifexp_billing_return'
export const BILLING_RETURN_COOKIE_KEY = 'lifexp_br'

const BILLING_RETURN_MAX_AGE_MS = 60 * 60 * 1000

export function isBillingReturnPath(pathname: string): boolean {
  return BILLING_RETURN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

type BillingReturnSnapshot = FamilySession & { savedAt: number }

function parseBillingReturnSnapshot(raw: string): BillingReturnSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as Partial<BillingReturnSnapshot>
    const familyId = typeof parsed.familyId === 'string' ? parsed.familyId : ''
    const memberId = typeof parsed.memberId === 'string' ? parsed.memberId : ''
    const memberKind =
      parsed.memberKind === 'parent' || parsed.memberKind === 'child' ? parsed.memberKind : null
    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0
    if (!familyId || !memberId || !memberKind || !savedAt) return null
    if (Date.now() - savedAt > BILLING_RETURN_MAX_AGE_MS) return null
    return { familyId, memberId, memberKind, savedAt }
  } catch {
    return null
  }
}

function readBillingReturnSnapshot(): BillingReturnSnapshot | null {
  if (typeof window === 'undefined') return null

  try {
    const fromSession = sessionStorage.getItem(BILLING_RETURN_SESSION_KEY)
    if (fromSession) {
      const parsed = parseBillingReturnSnapshot(fromSession)
      if (parsed) return parsed
    }
  } catch {
    /* ignore */
  }

  const fromCookie = getBridgedCookie(BILLING_RETURN_COOKIE_KEY)
  if (fromCookie) {
    return parseBillingReturnSnapshot(fromCookie)
  }

  return null
}

export function clearBillingReturnSnapshots(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(BILLING_RETURN_SESSION_KEY)
  } catch {
    /* ignore */
  }
  clearBridgedCookie(BILLING_RETURN_COOKIE_KEY)
}

/** Vor Stripe-Redirect: Session in Cookie + sessionStorage sichern. */
export function prepareBillingExternalRedirect(): void {
  if (typeof window === 'undefined') return

  const session = readFamilySession()
  if (!session) return

  mirrorBridgedStorageToCookies()

  const snapshot: BillingReturnSnapshot = { ...session, savedAt: Date.now() }
  const encoded = JSON.stringify(snapshot)

  try {
    sessionStorage.setItem(BILLING_RETURN_SESSION_KEY, encoded)
  } catch {
    /* ignore */
  }
  setBridgedCookie(BILLING_RETURN_COOKIE_KEY, encoded)
}

function restoreSessionFromSnapshot(snapshot: BillingReturnSnapshot): FamilySession {
  const session: FamilySession = {
    familyId: snapshot.familyId,
    memberKind: snapshot.memberKind,
    memberId: snapshot.memberId,
  }
  storeFamilySession(session)
  clearBillingReturnSnapshots()
  clearFamilyOnboardingDraft()
  return session
}

/** Nach Stripe-Redirect: localStorage, Cookie, sessionStorage — alles probieren. */
export function recoverFamilySessionAfterBillingRedirect(): FamilySession | null {
  bootstrapClientStorageFromCookies()
  mirrorBridgedStorageToCookies()

  const existing = readFamilySession()
  if (existing) {
    clearFamilyOnboardingDraft()
    clearBillingReturnSnapshots()
    return existing
  }

  const snapshot = readBillingReturnSnapshot()
  if (snapshot) {
    return restoreSessionFromSnapshot(snapshot)
  }

  return null
}

export type VerifiedCheckoutSession = {
  family_id: string
  member_kind?: FamilySessionMemberKind | null
  member_id?: string | null
  payment_status: string
  status: string
}

/** Stripe session_id + gespeichertes Snapshot oder Checkout-Metadata — Fallback wenn Cookies fehlen. */
export async function recoverFamilySessionFromStripeCheckout(
  checkoutSessionId: string,
  verifyCheckout: (sessionId: string) => Promise<VerifiedCheckoutSession>,
): Promise<FamilySession | null> {
  let verified: VerifiedCheckoutSession
  try {
    verified = await verifyCheckout(checkoutSessionId)
  } catch {
    return null
  }

  if (verified.status !== 'complete') {
    return null
  }
  if (verified.payment_status !== 'paid' && verified.payment_status !== 'no_payment_required') {
    return null
  }

  const snapshot = readBillingReturnSnapshot()
  if (snapshot && verified.family_id === snapshot.familyId) {
    return restoreSessionFromSnapshot(snapshot)
  }

  const memberKind = verified.member_kind
  const memberId = verified.member_id
  if (verified.family_id && memberKind && memberId) {
    const session: FamilySession = {
      familyId: verified.family_id,
      memberKind,
      memberId,
    }
    storeFamilySession(session)
    clearBillingReturnSnapshots()
    clearFamilyOnboardingDraft()
    return session
  }

  return null
}

/** @deprecated Alias — nutzt recoverFamilySessionAfterBillingRedirect */
export function bootstrapFamilySessionAfterExternalRedirect(): FamilySession | null {
  return recoverFamilySessionAfterBillingRedirect()
}

export function notifyFamilySessionRestoredIfNeeded(
  storedSession: FamilySession | null,
  contextHasSession: boolean,
): void {
  if (storedSession && !contextHasSession && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FAMILY_SESSION_CHANGED_EVENT))
  }
}

export function isValidBillingReturnMemberKind(value: unknown): value is FamilySessionMemberKind {
  return value === 'parent' || value === 'child'
}
