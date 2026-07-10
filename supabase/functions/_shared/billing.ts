import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/** Deno Edge Functions nutzen Web Crypto — für Webhook-Signaturprüfung erforderlich. */
export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider()

export function getStripe(): Stripe {
  const secret = Deno.env.get('STRIPE_SECRET_KEY')?.trim()
  if (!secret) throw new Error('STRIPE_SECRET_KEY missing')
  return new Stripe(secret, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })
}

const PRODUCTION_SITE_URL = 'https://family.life-xp.de'

const ALLOWED_SITE_HOSTS = new Set([
  'family.life-xp.de',
  'www.family.life-xp.de',
  'localhost',
  '127.0.0.1',
])

function normalizeSiteUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase()
    if (!ALLOWED_SITE_HOSTS.has(host) && !host.endsWith('.vercel.app')) return null
    return url.origin.replace(/\/$/, '')
  } catch {
    return null
  }
}

/** Stripe-Redirects — bevorzugt die aktuelle App-Origin vom Client, dann Secret, dann Produktion. */
export function resolveSiteUrl(req: Request, bodySiteUrl?: string | null): string {
  const fromBody = normalizeSiteUrl(bodySiteUrl)
  if (fromBody) return fromBody

  const fromEnv = normalizeSiteUrl(Deno.env.get('SITE_URL'))
  if (fromEnv) return fromEnv

  const fromOrigin = normalizeSiteUrl(req.headers.get('origin'))
  if (fromOrigin) return fromOrigin

  const referer = req.headers.get('referer')
  if (referer) {
    try {
      const fromReferer = normalizeSiteUrl(new URL(referer).origin)
      if (fromReferer) return fromReferer
    } catch {
      /* ignore */
    }
  }

  return PRODUCTION_SITE_URL
}

/** @deprecated Nutze resolveSiteUrl — Alias für bestehende Imports. */
export function getSiteUrl(req: Request, bodySiteUrl?: string | null): string {
  return resolveSiteUrl(req, bodySiteUrl)
}

export function requireStripePriceId(): string {
  const priceId = Deno.env.get('STRIPE_PRICE_ID')?.trim()
  if (!priceId) throw new Error('STRIPE_PRICE_ID fehlt in Edge Function Secrets.')
  return priceId
}

function requireStripeSecretKey(): string {
  const secret = Deno.env.get('STRIPE_SECRET_KEY')?.trim()
  if (!secret) throw new Error('STRIPE_SECRET_KEY missing')
  return secret
}

type StripeApiError = { error?: { message?: string } }

/** Stripe Checkout — natives fetch statt SDK (zuverlässiger in Deno Edge). */
export async function createCheckoutSessionViaFetch(input: {
  priceId: string
  siteUrl: string
  familyId: string
  memberKind: string
  memberId: string
  customerId?: string | null
}): Promise<{ id: string; url: string | null }> {
  const fields: Record<string, string> = {
    mode: 'subscription',
    'line_items[0][price]': input.priceId,
    'line_items[0][quantity]': '1',
    success_url: `${input.siteUrl}/plus/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.siteUrl}/plus/cancel`,
    client_reference_id: input.familyId,
    'metadata[family_id]': input.familyId,
    'metadata[member_kind]': input.memberKind,
    'metadata[member_id]': input.memberId,
    'subscription_data[metadata][family_id]': input.familyId,
  }
  if (input.customerId) fields.customer = input.customerId

  const secret = requireStripeSecretKey()
  const body = new URLSearchParams(fields)
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const json = (await res.json()) as { id?: string; url?: string | null } & StripeApiError
  if (!res.ok) {
    throw new Error(json.error?.message ?? 'Stripe Checkout fehlgeschlagen.')
  }
  if (!json.id) throw new Error('Stripe Checkout-Antwort ungültig.')
  return { id: json.id, url: json.url ?? null }
}

export function planFromSubscriptionStatus(status: string): 'free' | 'plus' {
  return status === 'active' || status === 'trialing' || status === 'past_due' ? 'plus' : 'free'
}

/** PLUS berechtigt solange current_period_end in der Zukunft liegt (Kündigung zum Periodenende). */
export function isPlusEntitledFromSubscription(
  status: string,
  periodEndUnix: number | null,
  nowMs = Date.now(),
): boolean {
  if (periodEndUnix !== null && periodEndUnix * 1000 > nowMs) return true
  return planFromSubscriptionStatus(status) === 'plus'
}

let cachedPortalConfigurationId: string | null | undefined

/** Portal-Konfiguration mit Kündigung zum Periodenende (Cancel at end of billing period). */
export async function resolveBillingPortalConfigurationId(stripe: Stripe): Promise<string | undefined> {
  const fromEnv = Deno.env.get('STRIPE_PORTAL_CONFIGURATION_ID')?.trim()
  if (fromEnv) return fromEnv

  if (cachedPortalConfigurationId !== undefined) {
    return cachedPortalConfigurationId ?? undefined
  }

  try {
    const configs = await stripe.billingPortal.configurations.list({ limit: 20 })
    const match = configs.data.find(
      (row) =>
        row.active &&
        row.features?.subscription_cancel?.enabled === true &&
        row.features.subscription_cancel.mode === 'at_period_end',
    )
    if (match) {
      cachedPortalConfigurationId = match.id
      return match.id
    }

    console.warn(
      'stripe portal: keine Konfiguration mit subscription_cancel.mode=at_period_end — Dashboard prüfen oder STRIPE_PORTAL_CONFIGURATION_ID setzen',
    )
    cachedPortalConfigurationId = null
    return undefined
  } catch (error) {
    console.warn('stripe portal configuration lookup failed', error)
    cachedPortalConfigurationId = null
    return undefined
  }
}

/** Stripe Unix-Sekunden → ISO timestamptz; nur wenn der Wert gültig ist. */
export function stripeUnixToTimestamptz(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  const instant = new Date(value * 1000)
  if (Number.isNaN(instant.getTime())) return null
  return instant.toISOString()
}

function readPositiveUnix(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return value
}

/** Periodenende — Top-Level oder erstes Subscription-Item (Webhook-Payload variiert). */
export function subscriptionPeriodEndUnix(subscription: Stripe.Subscription): number | null {
  const topLevel = readPositiveUnix(subscription.current_period_end)
  if (topLevel !== null) return topLevel

  for (const item of subscription.items?.data ?? []) {
    const fromItem = readPositiveUnix(item.current_period_end)
    if (fromItem !== null) return fromItem
  }

  return null
}

export function subscriptionTrialEndUnix(subscription: Stripe.Subscription): number | null {
  return readPositiveUnix(subscription.trial_end)
}

const TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'incomplete_expired',
])

const BILLING_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** family_id / member_id aus FamilySession — vor DB-Queries prüfen (kein Postgres-UUID-Fehler). */
export function requireBillingUuid(value: string, field: string): void {
  if (!BILLING_UUID_RE.test(value)) {
    throw new Response(JSON.stringify({ error: `${field} muss eine gültige UUID sein.` }), { status: 400 })
  }
}

/** Webhook-Events können unvollständige Subscription-Objekte liefern. */
export async function ensureFullStripeSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<Stripe.Subscription> {
  if (!subscription.id) return subscription

  const hasStatus = typeof subscription.status === 'string' && subscription.status.length > 0
  const hasPeriodEnd = subscriptionPeriodEndUnix(subscription) !== null
  if (hasStatus && hasPeriodEnd) return subscription

  try {
    return await stripe.subscriptions.retrieve(subscription.id)
  } catch (error) {
    console.warn('ensureFullStripeSubscription retrieve failed', subscription.id, error)
    return subscription
  }
}

export function buildFamilyBillingPatchFromSubscription(
  subscription: Stripe.Subscription,
  customerId: string,
): Record<string, unknown> {
  const status = typeof subscription.status === 'string' ? subscription.status : 'unknown'
  const periodEndUnix = subscriptionPeriodEndUnix(subscription)
  const plusUntil = stripeUnixToTimestamptz(periodEndUnix)
  const cancelAtPeriodEnd = subscription.cancel_at_period_end === true
  const plan = isPlusEntitledFromSubscription(status, periodEndUnix) ? 'plus' : 'free'

  const patch: Record<string, unknown> = {
    plan,
    subscription_status: status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    cancel_at_period_end: cancelAtPeriodEnd,
    updated_at: new Date().toISOString(),
  }

  if (plusUntil !== null) {
    patch.plus_until = plusUntil
  } else if (TERMINAL_SUBSCRIPTION_STATUSES.has(status)) {
    patch.plus_until = null
  }

  const trialEndUnix = subscriptionTrialEndUnix(subscription)
  if (trialEndUnix !== null) {
    patch.trial_ends_at = stripeUnixToTimestamptz(trialEndUnix)
  } else if (subscription.trial_end === null) {
    patch.trial_ends_at = null
  }

  return patch
}

type BillingFamilyRow = {
  id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export async function fetchFamilyForBilling(
  admin: SupabaseClient,
  familyId: string,
): Promise<BillingFamilyRow> {
  const { data, error } = await admin
    .from('families')
    .select('id, stripe_customer_id, stripe_subscription_id')
    .eq('id', familyId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Response(JSON.stringify({ error: 'Familie nicht gefunden.' }), { status: 404 })
  return data as BillingFamilyRow
}

export async function assertFamilySessionBillingAdmin(
  admin: SupabaseClient,
  familyId: string,
  memberKind: 'parent' | 'child',
  memberId: string,
): Promise<void> {
  if (memberKind === 'parent') {
    const { data: membership, error: membershipError } = await admin
      .from('family_members')
      .select('role, parent_id')
      .eq('family_id', familyId)
      .eq('parent_id', memberId)
      .maybeSingle()

    if (membershipError) throw new Error(membershipError.message)
    if (!membership) {
      throw new Response(JSON.stringify({ error: 'Kein Zugriff auf diese Familie.' }), { status: 403 })
    }

    const role = membership.role as string
    if (role !== 'owner' && role !== 'parent') {
      throw new Response(JSON.stringify({ error: 'Nur Familien-Admins dürfen das Abo verwalten.' }), { status: 403 })
    }

    const { data: profile, error: profileError } = await admin
      .from('parent_profiles')
      .select('can_admin')
      .eq('id', memberId)
      .maybeSingle()

    if (profileError) throw new Error(profileError.message)
    if (!profile || profile.can_admin === false) {
      throw new Response(JSON.stringify({ error: 'Nur Familien-Admins dürfen das Abo verwalten.' }), { status: 403 })
    }
    return
  }

  const { data: child, error: childError } = await admin
    .from('child_profiles')
    .select('id, family_id, can_admin')
    .eq('id', memberId)
    .eq('family_id', familyId)
    .maybeSingle()

  if (childError) throw new Error(childError.message)
  if (!child || child.can_admin !== true) {
    throw new Response(JSON.stringify({ error: 'Nur Familien-Admins dürfen das Abo verwalten.' }), { status: 403 })
  }
}

/** @deprecated Supabase Auth — PWA nutzt FamilySession */
export async function assertFamilyBillingAdmin(
  admin: SupabaseClient,
  userId: string,
  familyId: string,
): Promise<void> {
  const { data: members, error: membersError } = await admin
    .from('family_members')
    .select('parent_id')
    .eq('family_id', familyId)

  if (membersError) throw new Error(membersError.message)

  const parentIds = (members ?? [])
    .map((row) => row.parent_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  if (parentIds.length === 0) {
    throw new Response(JSON.stringify({ error: 'Keine Eltern in dieser Familie.' }), { status: 403 })
  }

  const { data: profile, error: profileError } = await admin
    .from('parent_profiles')
    .select('id, can_admin')
    .in('id', parentIds)
    .eq('auth_user_id', userId)
    .eq('can_admin', true)
    .maybeSingle()

  if (profileError) throw new Error(profileError.message)
  if (!profile) {
    throw new Response(
      JSON.stringify({
        error: 'Nur ein verknüpfter Familien-Admin darf das Abo verwalten.',
      }),
      { status: 403 },
    )
  }
}

export async function syncFamilyFromSubscription(
  admin: SupabaseClient,
  familyId: string,
  subscription: Stripe.Subscription,
  customerId: string,
): Promise<void> {
  const patch = buildFamilyBillingPatchFromSubscription(subscription, customerId)

  const { error } = await admin.from('families').update(patch).eq('id', familyId)

  if (error) throw new Error(error.message)
}

export async function syncFamilyFromCheckoutSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<{ familyId: string | null; synced: boolean }> {
  if (session.mode !== 'subscription' || session.status !== 'complete') {
    return { familyId: null, synced: false }
  }

  const paymentStatus = session.payment_status ?? 'unpaid'
  if (paymentStatus !== 'paid' && paymentStatus !== 'no_payment_required') {
    return { familyId: null, synced: false }
  }

  const familyId = await resolveFamilyIdFromStripeObject(
    admin,
    session.metadata,
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
    typeof session.customer === 'string' ? session.customer : session.customer?.id,
  )
  if (!familyId) return { familyId: null, synced: false }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id
  if (!subscriptionId || !customerId) return { familyId, synced: false }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await syncFamilyFromSubscription(admin, familyId, subscription, customerId)
  return { familyId, synced: true }
}

export async function syncFamilyBillingFromStripe(
  admin: SupabaseClient,
  familyId: string,
): Promise<{ synced: boolean; subscriptionStatus: string | null }> {
  const family = await fetchFamilyForBilling(admin, familyId)
  const stripe = getStripe()

  if (family.stripe_subscription_id) {
    const subscription = await stripe.subscriptions.retrieve(family.stripe_subscription_id)
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    await syncFamilyFromSubscription(admin, familyId, subscription, customerId)
    return { synced: true, subscriptionStatus: subscription.status }
  }

  if (family.stripe_customer_id) {
    const subscriptions = await stripe.subscriptions.list({
      customer: family.stripe_customer_id,
      status: 'all',
      limit: 10,
    })
    const preferred =
      subscriptions.data.find((row) => row.status === 'active' || row.status === 'trialing') ??
      subscriptions.data[0]
    if (!preferred) return { synced: false, subscriptionStatus: null }

    const customerId =
      typeof preferred.customer === 'string' ? preferred.customer : preferred.customer.id
    await syncFamilyFromSubscription(admin, familyId, preferred, customerId)
    return { synced: true, subscriptionStatus: preferred.status }
  }

  return { synced: false, subscriptionStatus: null }
}

export async function resolveFamilyIdFromStripeObject(
  admin: SupabaseClient,
  metadata: Stripe.Metadata | null | undefined,
  subscriptionId?: string | null,
  customerId?: string | null,
): Promise<string | null> {
  const fromMeta = metadata?.family_id
  if (typeof fromMeta === 'string' && fromMeta.length > 0) return fromMeta

  if (subscriptionId) {
    const { data } = await admin
      .from('families')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()
    if (data?.id) return data.id as string
  }

  if (customerId) {
    const { data } = await admin
      .from('families')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    if (data?.id) return data.id as string
  }

  return null
}
