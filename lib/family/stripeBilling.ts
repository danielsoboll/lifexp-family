import { prepareBillingExternalRedirect, type VerifiedCheckoutSession } from './billingReturn'
import { readFamilySession } from '../familySession'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rethdsbfcwwvyynkmbjb.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_TOEljSaQMk7hp6DoOV_QcA_kZ4iZMSf'

function functionsBaseUrl(): string {
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`
}

function edgeHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${supabaseAnonKey}`,
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
  }
}

/** Ruft create-checkout-session auf — kein Schreiben von Billing-Feldern im Frontend. */
export async function createPlusCheckoutSession(familyId: string): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const response = await fetch(`${functionsBaseUrl()}/create-checkout-session`, {
    method: 'POST',
    headers: edgeHeaders(),
    body: JSON.stringify({
      family_id: familyId,
      member_kind: session.memberKind,
      member_id: session.memberId,
    }),
  })

  const payload = (await response.json()) as { url?: string; error?: string }
  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? 'Checkout fehlgeschlagen.')
  }

  prepareBillingExternalRedirect()

  return { url: payload.url }
}

/** Portal — liest stripe_customer_id nur serverseitig (Webhook). */
export async function createPlusPortalSession(familyId: string): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const response = await fetch(`${functionsBaseUrl()}/create-customer-portal-session`, {
    method: 'POST',
    headers: edgeHeaders(),
    body: JSON.stringify({
      family_id: familyId,
      member_kind: session.memberKind,
      member_id: session.memberId,
    }),
  })

  const payload = (await response.json()) as { url?: string; error?: string }
  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? 'Portal fehlgeschlagen.')
  }

  prepareBillingExternalRedirect()

  return { url: payload.url }
}

/** Stripe Checkout nach Redirect verifizieren (family_id aus metadata). */
export async function verifyStripeCheckoutSession(sessionId: string): Promise<VerifiedCheckoutSession> {
  const response = await fetch(`${functionsBaseUrl()}/verify-checkout-session`, {
    method: 'POST',
    headers: edgeHeaders(),
    body: JSON.stringify({ session_id: sessionId }),
  })

  const payload = (await response.json()) as VerifiedCheckoutSession & { error?: string }
  if (!response.ok || !payload.family_id) {
    throw new Error(payload.error ?? 'Checkout konnte nicht verifiziert werden.')
  }

  return payload
}

/** Stripe-Abo manuell synchronisieren (Fallback wenn Webhook verzögert/fehlgeschlagen). */
export async function syncPlusBillingFromStripe(familyId: string): Promise<{ synced: boolean }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const response = await fetch(`${functionsBaseUrl()}/sync-family-billing`, {
    method: 'POST',
    headers: edgeHeaders(),
    body: JSON.stringify({
      family_id: familyId,
      member_kind: session.memberKind,
      member_id: session.memberId,
    }),
  })

  const payload = (await response.json()) as { synced?: boolean; error?: string }
  if (!response.ok) {
    throw new Error(payload.error ?? 'Synchronisation fehlgeschlagen.')
  }

  return { synced: payload.synced === true }
}
