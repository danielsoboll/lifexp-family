import { prepareBillingExternalRedirect, type VerifiedCheckoutSession } from './billingReturn'
import { readFamilySession } from '../familySession'
import { resolveFamilySiteOrigin } from './siteOrigin'

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
    site_url: resolveFamilySiteOrigin(),
  }
}

type BillingUrlResponse = { url?: string; error?: string }

function shouldFallbackFromBillingBackend(status: number, payload: BillingUrlResponse): boolean {
  if (status === 404) return true
  if (status === 503) return true
  const message = payload.error?.toLowerCase() ?? ''
  return (
    message.includes('stripe_secret_key fehlt') ||
    message.includes('stripe_secret_key missing') ||
    message.includes('stripe_price_id fehlt') ||
    message.includes('supabase_service_role_key fehlt')
  )
}

async function requestBillingUrl(
  url: string,
  headers: Record<string, string>,
  body: Record<string, string>,
): Promise<{ ok: boolean; status: number; payload: BillingUrlResponse }> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  let payload: BillingUrlResponse = {}
  try {
    payload = (await response.json()) as BillingUrlResponse
  } catch {
    payload = {}
  }
  return { ok: response.ok, status: response.status, payload }
}

/**
 * Checkout/Portal: zuerst Supabase Edge Function (Stripe-Secrets dort),
 * optional Fallback auf Vercel /api/billing/* wenn konfiguriert.
 */
async function postBillingUrlRequest(
  apiPath: string,
  edgePath: string,
  body: Record<string, string>,
  fallbackLabel: string,
): Promise<{ url: string }> {
  let edgeError: string | null = null

  try {
    const edge = await requestBillingUrl(`${functionsBaseUrl()}${edgePath}`, edgeHeaders(), body)
    if (edge.ok && edge.payload.url) {
      return { url: edge.payload.url }
    }
    if (shouldFallbackFromBillingBackend(edge.status, edge.payload)) {
      edgeError = edge.payload.error ?? `Edge ${edge.status}`
    } else {
      throw new Error(edge.payload.error ?? `${fallbackLabel} fehlgeschlagen.`)
    }
  } catch (error) {
    if (error instanceof Error && !edgeError) {
      edgeError = error.message
    }
  }

  try {
    const api = await requestBillingUrl(apiPath, { 'Content-Type': 'application/json' }, body)
    if (api.ok && api.payload.url) {
      return { url: api.payload.url }
    }
    const apiMessage = api.payload.error ?? `${fallbackLabel} fehlgeschlagen.`
    if (edgeError && shouldFallbackFromBillingBackend(api.status, api.payload)) {
      throw new Error(edgeError)
    }
    throw new Error(apiMessage)
  } catch (error) {
    if (error instanceof Error && edgeError && error.message !== edgeError) {
      throw new Error(edgeError)
    }
    throw error
  }
}

/** Checkout — Stripe Live über Vercel-API oder Supabase Edge Function. */
export async function createPlusCheckoutSession(familyId: string): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const result = await postBillingUrlRequest(
    '/api/billing/create-checkout-session',
    '/create-checkout-session',
    billingRequestBody(familyId, session),
    'Checkout',
  )

  prepareBillingExternalRedirect()
  return result
}

/** Portal — Vercel-API oder Supabase Edge Function. */
export async function createPlusPortalSession(familyId: string): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const result = await postBillingUrlRequest(
    '/api/billing/create-customer-portal-session',
    '/create-customer-portal-session',
    billingRequestBody(familyId, session),
    'Portal',
  )

  prepareBillingExternalRedirect()
  return result
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
