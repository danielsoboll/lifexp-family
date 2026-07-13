import { prepareBillingExternalRedirect, type VerifiedCheckoutSession } from './billingReturn'
import { readFamilySession } from '../familySession'
import { resolveFamilySiteOrigin } from './siteOrigin'

type BillingApiResponse = { error?: string }

function checkoutBody(session: NonNullable<ReturnType<typeof readFamilySession>>) {
  return {
    familyId: session.familyId,
    memberKind: session.memberKind,
    memberId: session.memberId,
    siteUrl: resolveFamilySiteOrigin(),
  }
}

async function invokeBillingApi<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  let payload: (T & BillingApiResponse) | BillingApiResponse = {}
  try {
    payload = (await response.json()) as T & BillingApiResponse
  } catch {
    payload = {}
  }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Stripe-Anfrage fehlgeschlagen.')
  }

  if (payload.error) {
    throw new Error(payload.error)
  }

  return payload as T
}

export async function createPlusCheckoutSession(): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const data = await invokeBillingApi<{ url?: string }>('/api/billing/checkout', checkoutBody(session))
  if (!data?.url) throw new Error('Checkout-URL fehlt.')

  prepareBillingExternalRedirect()
  return { url: data.url }
}

export async function createPlusPortalSession(_familyId: string): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const data = await invokeBillingApi<{ url?: string }>('/api/billing/portal', checkoutBody(session))
  if (!data?.url) throw new Error('Portal-URL fehlt.')

  prepareBillingExternalRedirect()
  return { url: data.url }
}

export async function verifyStripeCheckoutSession(sessionId: string): Promise<VerifiedCheckoutSession> {
  const data = await invokeBillingApi<VerifiedCheckoutSession>('/api/billing/verify', { sessionId })
  if (!data?.family_id) throw new Error('Checkout konnte nicht verifiziert werden.')
  return data
}

export async function syncPlusBillingFromStripe(_familyId: string): Promise<{ synced: boolean }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const data = await invokeBillingApi<{ synced?: boolean }>('/api/billing/sync', checkoutBody(session))
  return { synced: data?.synced === true }
}
