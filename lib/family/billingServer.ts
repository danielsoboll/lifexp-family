import type { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

import { FAMILY_SITE_ORIGIN } from './siteOrigin'
import { isAdminRole } from './members'
import type { FamilySessionMemberKind } from '../familySession'

export type BillingEnv = {
  stripeSecretKey: string
  stripePriceId: string
  siteUrl: string
}

export type BillingSessionInput = {
  familyId: string
  memberKind: FamilySessionMemberKind
  memberId: string
}

type BillingFamilyRow = {
  id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

function normalizeSiteUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin.replace(/\/$/, '')
  } catch {
    return null
  }
}

export function readBillingEnv(request?: Request, siteUrlOverride?: string | null): BillingEnv {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim()
  const stripePriceId = process.env.STRIPE_PRICE_ID?.trim()

  const fromOverride = normalizeSiteUrl(siteUrlOverride)
  let siteUrl = fromOverride ?? normalizeSiteUrl(process.env.SITE_URL)

  if (!siteUrl && request) {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    if (host) {
      siteUrl = normalizeSiteUrl(`${proto}://${host.split(',')[0]?.trim()}`)
    }
  }

  if (!siteUrl) siteUrl = FAMILY_SITE_ORIGIN

  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY fehlt — in Vercel Environment Variables setzen.')
  }
  if (!stripePriceId) {
    throw new Error('STRIPE_PRICE_ID fehlt — in Vercel Environment Variables setzen.')
  }

  return { stripeSecretKey, stripePriceId, siteUrl }
}

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey)
}

async function fetchFamilyForBilling(admin: SupabaseClient, familyId: string): Promise<BillingFamilyRow> {
  const { data, error } = await admin
    .from('families')
    .select('id, stripe_customer_id, stripe_subscription_id')
    .eq('id', familyId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Familie nicht gefunden.')
  return data as BillingFamilyRow
}

export async function assertFamilySessionBillingAdmin(
  admin: SupabaseClient,
  familyId: string,
  memberKind: FamilySessionMemberKind,
  memberId: string,
): Promise<void> {
  if (memberKind === 'parent') {
    const { data: membership, error: membershipError } = await admin
      .from('family_members')
      .select('role, parent_profiles!inner(id, can_admin)')
      .eq('family_id', familyId)
      .eq('parent_id', memberId)
      .maybeSingle()

    if (membershipError) throw new Error(membershipError.message)
    if (!membership) throw new Error('Kein Zugriff auf diese Familie.')

    const profileRaw = membership.parent_profiles as { can_admin?: boolean } | { can_admin?: boolean }[] | null
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw
    const role = membership.role as string
    const canAdmin = profile?.can_admin !== false
    const isFamilyParent = isAdminRole(role as 'owner' | 'parent' | 'child')

    if (!canAdmin || !isFamilyParent) {
      throw new Error('Nur Familien-Admins dürfen das Abo verwalten.')
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
    throw new Error('Nur Familien-Admins dürfen das Abo verwalten.')
  }
}

function isStaleStripeCustomerError(error: unknown): boolean {
  if (!(error instanceof Stripe.errors.StripeError)) return false
  if (error.code === 'resource_missing' && error.param === 'customer') return true
  const message = error.message.toLowerCase()
  return message.includes('no such customer') || message.includes('a similar object exists in test mode')
}

let cachedPortalConfigurationId: string | null | undefined

/** Portal-Konfiguration mit Kündigung zum Periodenende (Cancel at end of billing period). */
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

export async function createFamilyCheckoutSession(
  admin: SupabaseClient,
  env: BillingEnv,
  input: BillingSessionInput,
): Promise<{ url: string }> {
  await assertFamilySessionBillingAdmin(admin, input.familyId, input.memberKind, input.memberId)
  const family = await fetchFamilyForBilling(admin, input.familyId)
  const stripe = createStripeClient(env.stripeSecretKey)

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: env.stripePriceId, quantity: 1 }],
    success_url: `${env.siteUrl}/plus/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.siteUrl}/plus/cancel`,
    client_reference_id: input.familyId,
    metadata: {
      family_id: input.familyId,
      member_kind: input.memberKind,
      member_id: input.memberId,
    },
    subscription_data: {
      metadata: {
        family_id: input.familyId,
      },
    },
  }

  if (family.stripe_customer_id) {
    sessionParams.customer = family.stripe_customer_id
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams)
    if (!session.url) throw new Error('Checkout-URL konnte nicht erstellt werden.')
    return { url: session.url }
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      const message = error.message.toLowerCase()
      if (message.includes('no such price') || message.includes('a similar object exists in test mode')) {
        throw new Error(
          'STRIPE_PRICE_ID passt nicht zum Stripe-Modus (Live vs. Test). Bitte Live-Price-ID in den Secrets prüfen.',
        )
      }
    }
    if (!family.stripe_customer_id || !isStaleStripeCustomerError(error)) throw error

    const retryParams = { ...sessionParams }
    delete retryParams.customer
    const session = await stripe.checkout.sessions.create(retryParams)
    if (!session.url) throw new Error('Checkout-URL konnte nicht erstellt werden.')
    return { url: session.url }
  }
}

export async function createFamilyPortalSession(
  admin: SupabaseClient,
  env: BillingEnv,
  input: BillingSessionInput,
): Promise<{ url: string }> {
  await assertFamilySessionBillingAdmin(admin, input.familyId, input.memberKind, input.memberId)
  const family = await fetchFamilyForBilling(admin, input.familyId)

  if (!family.stripe_customer_id) {
    throw new Error('Noch kein Stripe-Kunde — zuerst PLUS aktivieren.')
  }

  const stripe = createStripeClient(env.stripeSecretKey)

  try {
    const configuration = await resolveBillingPortalConfigurationId(stripe)
    const portal = await stripe.billingPortal.sessions.create({
      customer: family.stripe_customer_id,
      return_url: `${env.siteUrl}/admin/settings`,
      ...(configuration ? { configuration } : {}),
    })

    if (!portal.url) throw new Error('Portal-URL konnte nicht erstellt werden.')
    return { url: portal.url }
  } catch (error) {
    if (!isStaleStripeCustomerError(error)) throw error
    throw new Error(
      'Der gespeicherte Stripe-Kunde passt nicht mehr (z. B. nach Wechsel Test → Live). Bitte PLUS erneut aktivieren.',
    )
  }
}
