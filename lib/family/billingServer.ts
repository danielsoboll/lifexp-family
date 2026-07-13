import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

import { assertFamilyAdminAuthorized } from './deleteFamilyCascade'

const PRODUCTION_SITE_URL = 'https://family.life-xp.de'

const ALLOWED_SITE_HOSTS = new Set([
  'family.life-xp.de',
  'www.family.life-xp.de',
  'localhost',
  '127.0.0.1',
])

const BILLING_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const TERMINAL_SUBSCRIPTION_STATUSES = new Set(['canceled', 'unpaid', 'incomplete_expired'])

let stripeClient: Stripe | null | undefined
let cachedPortalConfigurationId: string | null | undefined

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

export function resolveSiteUrlFromRequest(request: Request, bodySiteUrl?: string | null): string {
  const fromBody = normalizeSiteUrl(bodySiteUrl)
  if (fromBody) return fromBody

  const fromEnv = normalizeSiteUrl(process.env.SITE_URL)
  if (fromEnv) return fromEnv

  const fromOrigin = normalizeSiteUrl(request.headers.get('origin'))
  if (fromOrigin) return fromOrigin

  const referer = request.headers.get('referer')
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

export function getStripeServer(): Stripe {
  if (stripeClient !== undefined) return stripeClient as Stripe

  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY fehlt in Vercel-Umgebungsvariablen.')
  }

  stripeClient = new Stripe(secret)
  return stripeClient
}

export function requireStripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID?.trim()
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID fehlt in Vercel-Umgebungsvariablen.')
  }
  return priceId
}

export function requireBillingUuid(value: string, field: string): void {
  if (!BILLING_UUID_RE.test(value)) {
    throw new Error(`${field} muss eine gültige UUID sein.`)
  }
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
  if (!data) throw new Error('Familie nicht gefunden.')
  return data as BillingFamilyRow
}

export async function assertBillingSessionAuthorized(
  admin: SupabaseClient,
  familyId: string,
  memberKind: 'parent' | 'child',
  memberId: string,
): Promise<void> {
  const authError = await assertFamilyAdminAuthorized(admin, familyId, memberKind, memberId)
  if (authError.error) throw authError.error
}

function stripeUnixToTimestamptz(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  const instant = new Date(value * 1000)
  if (Number.isNaN(instant.getTime())) return null
  return instant.toISOString()
}

function readPositiveUnix(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return value
}

function subscriptionPeriodEndUnix(subscription: Stripe.Subscription): number | null {
  const topLevel = readPositiveUnix(subscription.current_period_end)
  if (topLevel !== null) return topLevel

  for (const item of subscription.items?.data ?? []) {
    const fromItem = readPositiveUnix((item as Stripe.SubscriptionItem & { current_period_end?: number }).current_period_end)
    if (fromItem !== null) return fromItem
  }

  return null
}

function planFromSubscriptionStatus(status: string): 'free' | 'plus' {
  return status === 'active' || status === 'trialing' || status === 'past_due' ? 'plus' : 'free'
}

function isPlusEntitledFromSubscription(status: string, periodEndUnix: number | null, nowMs = Date.now()): boolean {
  if (periodEndUnix !== null && periodEndUnix * 1000 > nowMs) return true
  return planFromSubscriptionStatus(status) === 'plus'
}

function buildFamilyBillingPatchFromSubscription(
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

  const trialEndUnix = readPositiveUnix(subscription.trial_end)
  if (trialEndUnix !== null) {
    patch.trial_ends_at = stripeUnixToTimestamptz(trialEndUnix)
  } else if (subscription.trial_end === null) {
    patch.trial_ends_at = null
  }

  return patch
}

async function resolveBillingPortalConfigurationId(stripe: Stripe): Promise<string | undefined> {
  const fromEnv = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim()
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
    cachedPortalConfigurationId = match?.id ?? null
    return match?.id
  } catch {
    cachedPortalConfigurationId = null
    return undefined
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

async function resolveFamilyIdFromStripeObject(
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
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  if (!subscriptionId || !customerId) return { familyId, synced: false }

  const stripe = getStripeServer()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await syncFamilyFromSubscription(admin, familyId, subscription, customerId)
  return { familyId, synced: true }
}

export async function syncFamilyBillingFromStripeServer(
  admin: SupabaseClient,
  familyId: string,
): Promise<{ synced: boolean; subscriptionStatus: string | null }> {
  const family = await fetchFamilyForBilling(admin, familyId)
  const stripe = getStripeServer()

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

    const customerId = typeof preferred.customer === 'string' ? preferred.customer : preferred.customer.id
    await syncFamilyFromSubscription(admin, familyId, preferred, customerId)
    return { synced: true, subscriptionStatus: preferred.status }
  }

  return { synced: false, subscriptionStatus: null }
}

export async function createPlusCheckoutSessionServer(input: {
  admin: SupabaseClient
  request: Request
  familyId: string
  memberKind: 'parent' | 'child'
  memberId: string
  siteUrl?: string | null
}): Promise<{ url: string }> {
  requireBillingUuid(input.familyId, 'family_id')
  requireBillingUuid(input.memberId, 'member_id')

  await assertBillingSessionAuthorized(input.admin, input.familyId, input.memberKind, input.memberId)

  const priceId = requireStripePriceId()
  const family = await fetchFamilyForBilling(input.admin, input.familyId)
  const siteUrl = resolveSiteUrlFromRequest(input.request, input.siteUrl)
  const stripe = getStripeServer()

  const createSession = async (customerId?: string | null) => {
    return stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/plus/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/plus/cancel`,
      client_reference_id: input.familyId,
      metadata: {
        family_id: input.familyId,
        member_kind: input.memberKind,
        member_id: input.memberId,
      },
      subscription_data: {
        metadata: { family_id: input.familyId },
      },
      ...(customerId ? { customer: customerId } : {}),
    })
  }

  try {
    const session = await createSession(family.stripe_customer_id)
    if (!session.url) throw new Error('Checkout-URL konnte nicht erstellt werden.')
    return { url: session.url }
  } catch (stripeError) {
    const message =
      stripeError instanceof Error ? stripeError.message.toLowerCase() : String(stripeError).toLowerCase()

    if (message.includes('no such price') || message.includes('a similar object exists in test mode')) {
      throw new Error(
        'STRIPE_PRICE_ID passt nicht zum Stripe-Modus (Live vs. Test). Bitte Live-Price-ID in Vercel prüfen.',
      )
    }

    const staleCustomer =
      family.stripe_customer_id &&
      (message.includes('no such customer') || message.includes('a similar object exists in test mode'))

    if (!staleCustomer) throw stripeError

    const session = await createSession(null)
    if (!session.url) throw new Error('Checkout-URL konnte nicht erstellt werden.')
    return { url: session.url }
  }
}

export async function createPlusPortalSessionServer(input: {
  admin: SupabaseClient
  request: Request
  familyId: string
  memberKind: 'parent' | 'child'
  memberId: string
  siteUrl?: string | null
}): Promise<{ url: string }> {
  requireBillingUuid(input.familyId, 'family_id')
  requireBillingUuid(input.memberId, 'member_id')

  await assertBillingSessionAuthorized(input.admin, input.familyId, input.memberKind, input.memberId)

  const family = await fetchFamilyForBilling(input.admin, input.familyId)
  if (!family.stripe_customer_id) {
    throw new Error('Noch kein Stripe-Kunde — zuerst PLUS aktivieren.')
  }

  const stripe = getStripeServer()
  const siteUrl = resolveSiteUrlFromRequest(input.request, input.siteUrl)
  const configuration = await resolveBillingPortalConfigurationId(stripe)
  const portal = await stripe.billingPortal.sessions.create({
    customer: family.stripe_customer_id,
    return_url: `${siteUrl}/admin/settings`,
    ...(configuration ? { configuration } : {}),
  })

  return { url: portal.url }
}

export async function verifyCheckoutSessionServer(
  admin: SupabaseClient,
  sessionId: string,
): Promise<{
  family_id: string
  member_kind: 'parent' | 'child' | null
  member_id: string | null
  payment_status: string
  status: string
  plus_synced: boolean
}> {
  const stripe = getStripeServer()
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  const familyId =
    (typeof session.metadata?.family_id === 'string' && session.metadata.family_id) ||
    (typeof session.client_reference_id === 'string' && session.client_reference_id) ||
    ''

  if (!familyId) {
    throw new Error('Keine Familie in dieser Checkout-Sitzung.')
  }

  const memberKind =
    session.metadata?.member_kind === 'parent' || session.metadata?.member_kind === 'child'
      ? session.metadata.member_kind
      : null
  const memberId = typeof session.metadata?.member_id === 'string' ? session.metadata.member_id : null

  if (session.status !== 'complete') {
    throw new Error('Checkout noch nicht abgeschlossen.')
  }

  const paymentStatus = session.payment_status ?? 'unpaid'
  if (paymentStatus !== 'paid' && paymentStatus !== 'no_payment_required') {
    throw new Error('Zahlung noch nicht abgeschlossen.')
  }

  const { synced } = await syncFamilyFromCheckoutSession(admin, session)

  return {
    family_id: familyId,
    member_kind: memberKind,
    member_id: memberId,
    payment_status: paymentStatus,
    status: session.status,
    plus_synced: synced,
  }
}

export type BillingSessionBody = {
  familyId?: string
  memberId?: string
  memberKind?: 'parent' | 'child'
  siteUrl?: string
}

export function parseBillingSessionBody(body: BillingSessionBody): {
  familyId: string
  memberId: string
  memberKind: 'parent' | 'child'
  siteUrl?: string
} {
  const familyId = body.familyId?.trim()
  const memberId = body.memberId?.trim()
  const memberKind = body.memberKind

  if (!familyId || !memberId || (memberKind !== 'parent' && memberKind !== 'child')) {
    throw new Error('Session-Daten fehlen.')
  }

  return { familyId, memberId, memberKind, siteUrl: body.siteUrl?.trim() }
}
