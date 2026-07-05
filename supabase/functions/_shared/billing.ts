import Stripe from 'https://esm.sh/stripe@14.25.0?target=denonext'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/** Deno Edge Functions nutzen Web Crypto — für Webhook-Signaturprüfung erforderlich. */
export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider()

export function getStripe(): Stripe {
  const secret = Deno.env.get('STRIPE_SECRET_KEY')
  if (!secret) throw new Error('STRIPE_SECRET_KEY missing')
  return new Stripe(secret, { apiVersion: '2023-10-16' })
}

export function getSiteUrl(req: Request): string {
  const configured = Deno.env.get('SITE_URL')
  if (configured?.trim()) return configured.trim().replace(/\/$/, '')
  const origin = req.headers.get('origin')
  if (origin) return origin.replace(/\/$/, '')
  return 'http://localhost:3000'
}

export function requireStripePriceId(): string {
  const priceId = Deno.env.get('STRIPE_PRICE_ID')?.trim()
  if (!priceId) throw new Error('STRIPE_PRICE_ID fehlt in Edge Function Secrets.')
  return priceId
}

export function planFromSubscriptionStatus(status: string): 'free' | 'plus' {
  return status === 'active' || status === 'trialing' || status === 'past_due' ? 'plus' : 'free'
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
      .select('role, parent_profiles!inner(id, can_admin)')
      .eq('family_id', familyId)
      .eq('parent_id', memberId)
      .maybeSingle()

    if (membershipError) throw new Error(membershipError.message)
    if (!membership) {
      throw new Response(JSON.stringify({ error: 'Kein Zugriff auf diese Familie.' }), { status: 403 })
    }

    const profileRaw = membership.parent_profiles as { can_admin?: boolean } | { can_admin?: boolean }[] | null
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw
    const role = membership.role as string
    const canAdmin = profile?.can_admin !== false
    const isFamilyParent = role === 'owner' || role === 'parent'

    if (!canAdmin || !isFamilyParent) {
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
  const status = subscription.status
  const plan = planFromSubscriptionStatus(status)
  const plusUntil = new Date(subscription.current_period_end * 1000).toISOString()
  const trialEnds = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null

  // Einziger Schreibpfad für Billing-Felder (Service Role / Webhook / Checkout-Sync).
  const { error } = await admin
    .from('families')
    .update({
      plan,
      subscription_status: status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plus_until: plusUntil,
      trial_ends_at: trialEnds,
      updated_at: new Date().toISOString(),
    })
    .eq('id', familyId)

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
