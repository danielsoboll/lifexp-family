import { prepareBillingExternalRedirect, type VerifiedCheckoutSession } from './billingReturn'
import { readFamilySession } from '../familySession'
import { resolveFamilySiteOrigin } from './siteOrigin'
import { supabase } from '../supabase'

type BillingUrlResponse = { url?: string; error?: string }

function checkoutBody(session: NonNullable<ReturnType<typeof readFamilySession>>) {
  return {
    family_id: session.familyId,
    member_kind: session.memberKind,
    member_id: session.memberId,
    site_url: resolveFamilySiteOrigin(),
  }
}

async function invokeBilling<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, { body })

  if (error) {
    if (typeof error === 'object' && error !== null && 'context' in error) {
      const response = (error as { context?: Response }).context
      if (response instanceof Response) {
        try {
          const payload = (await response.clone().json()) as { error?: string }
          if (payload.error) throw new Error(payload.error)
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
            throw parseError
          }
        }
      }
    }
    throw new Error(error.message || 'Stripe-Anfrage fehlgeschlagen.')
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(data.error)
  }

  return data as T
}

export async function createPlusCheckoutSession(): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const data = await invokeBilling<BillingUrlResponse>('create-checkout-session', checkoutBody(session))
  if (!data?.url) throw new Error('Checkout-URL fehlt.')

  prepareBillingExternalRedirect()
  return { url: data.url }
}

export async function createPlusPortalSession(_familyId: string): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const data = await invokeBilling<BillingUrlResponse>('create-customer-portal-session', checkoutBody(session))
  if (!data?.url) throw new Error('Portal-URL fehlt.')

  prepareBillingExternalRedirect()
  return { url: data.url }
}

export async function verifyStripeCheckoutSession(sessionId: string): Promise<VerifiedCheckoutSession> {
  const data = await invokeBilling<VerifiedCheckoutSession>('verify-checkout-session', {
    session_id: sessionId,
  })
  if (!data?.family_id) throw new Error('Checkout konnte nicht verifiziert werden.')
  return data
}

export async function syncPlusBillingFromStripe(_familyId: string): Promise<{ synced: boolean }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const data = await invokeBilling<{ synced?: boolean }>('sync-family-billing', checkoutBody(session))
  return { synced: data?.synced === true }
}
