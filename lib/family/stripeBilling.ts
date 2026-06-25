import { readFamilySession } from '../familySession'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rethdsbfcwwvyynkmbjb.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_TOEljSaQMk7hp6DoOV_QcA_kZ4iZMSf'

/** Ruft create-checkout-session auf — kein Schreiben von Billing-Feldern im Frontend. */
export async function createPlusCheckoutSession(familyId: string): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
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

  return { url: payload.url }
}

/** Portal — liest stripe_customer_id nur serverseitig (Webhook). */
export async function createPlusPortalSession(familyId: string): Promise<{ url: string }> {
  const session = readFamilySession()
  if (!session) {
    throw new Error('Keine aktive Familien-Sitzung — bitte erneut einloggen.')
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/functions/v1/create-customer-portal-session`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        family_id: familyId,
        member_kind: session.memberKind,
        member_id: session.memberId,
      }),
    },
  )

  const payload = (await response.json()) as { url?: string; error?: string }
  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? 'Portal fehlgeschlagen.')
  }

  return { url: payload.url }
}
