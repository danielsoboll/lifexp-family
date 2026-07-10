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

function billingRequestBody(familyId: string, session: NonNullable<ReturnType<typeof readFamilySession>>) {
  return {
    family_id: familyId,
    member_kind: session.memberKind,
    member_id: session.memberId,
  }
}

async function postBillingApi<T extends { url?: string; error?: string }>(
  path: string,
  body: Record<string, string>,
): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = (await response.json()) as T
  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? 'Anfrage fehlgeschlagen.')
  }
  return payload
}

/** Checkout — Next.js API auf Vercel (Stripe Live Secrets dort). */
export async function createPlusCheckoutSession(familyId: string): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const payload = await postBillingApi<{ url: string; error?: string }>(
    '/api/billing/create-checkout-session',
    billingRequestBody(familyId, session),
  )

  prepareBillingExternalRedirect()
  return { url: payload.url }
}

/** Portal — Next.js API auf Vercel. */
export async function createPlusPortalSession(familyId: string): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const payload = await postBillingApi<{ url: string; error?: string }>(
    '/api/billing/create-customer-portal-session',
    billingRequestBody(familyId, session),
  )

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
    body: JSON.stringify(billingRequestBody(familyId, session)),
  })

  const payload = (await response.json()) as { synced?: boolean; error?: string }
  if (!response.ok) {
    throw new Error(payload.error ?? 'Synchronisation fehlgeschlagen.')
  }

  return { synced: payload.synced === true }
}
