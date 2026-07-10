import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'

import {
  assertFamilySessionBillingAdmin,
  fetchFamilyForBilling,
  getSiteUrl,
  getStripe,
  requireStripePriceId,
} from '../_shared/billing.ts'
import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const priceId = requireStripePriceId()
    getStripe()

    const body = (await req.json()) as {
      family_id?: string
      member_kind?: 'parent' | 'child'
      member_id?: string
      site_url?: string
    }

    const familyId = body.family_id?.trim()
    const memberId = body.member_id?.trim()
    const memberKind = body.member_kind

    if (!familyId) {
      return jsonResponse({ error: 'family_id fehlt.' }, 400)
    }
    if (!memberId || (memberKind !== 'parent' && memberKind !== 'child')) {
      return jsonResponse({ error: 'member_kind und member_id sind erforderlich.' }, 400)
    }

    const admin = getServiceClient()
    await assertFamilySessionBillingAdmin(admin, familyId, memberKind, memberId)
    const family = await fetchFamilyForBilling(admin, familyId)
    const stripe = getStripe()
    const siteUrl = getSiteUrl(req, body.site_url)

    // Nur lesen — Billing-Felder schreibt ausschließlich stripe-webhook.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/plus/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/plus/cancel`,
      client_reference_id: familyId,
      metadata: {
        family_id: familyId,
        member_kind: memberKind,
        member_id: memberId,
      },
      subscription_data: {
        metadata: {
          family_id: familyId,
        },
      },
    }

    if (family.stripe_customer_id) {
      sessionParams.customer = family.stripe_customer_id
    }

    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (stripeError) {
      const message =
        stripeError instanceof Error ? stripeError.message.toLowerCase() : String(stripeError).toLowerCase()

      if (message.includes('no such price') || message.includes('a similar object exists in test mode')) {
        return jsonResponse(
          {
            error:
              'STRIPE_PRICE_ID passt nicht zum Stripe-Modus (Live vs. Test). Bitte Live-Price-ID in den Secrets prüfen.',
          },
          500,
        )
      }

      const staleCustomer =
        family.stripe_customer_id &&
        (message.includes('no such customer') || message.includes('a similar object exists in test mode'))

      if (!staleCustomer) throw stripeError

      delete sessionParams.customer
      session = await stripe.checkout.sessions.create(sessionParams)
    }

    if (!session.url) {
      return jsonResponse({ error: 'Checkout-URL konnte nicht erstellt werden.' }, 500)
    }

    return jsonResponse({ url: session.url })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('create-checkout-session', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      500,
    )
  }
})
