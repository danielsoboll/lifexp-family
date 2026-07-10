import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import {
  assertFamilySessionBillingAdmin,
  createCheckoutSessionViaFetch,
  fetchFamilyForBilling,
  getSiteUrl,
  requireBillingUuid,
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

    requireBillingUuid(familyId, 'family_id')
    requireBillingUuid(memberId, 'member_id')

    const admin = getServiceClient()
    await assertFamilySessionBillingAdmin(admin, familyId, memberKind, memberId)
    const family = await fetchFamilyForBilling(admin, familyId)
    const siteUrl = getSiteUrl(req, body.site_url)

    let session: { id: string; url: string | null }
    try {
      session = await createCheckoutSessionViaFetch({
        priceId,
        siteUrl,
        familyId,
        memberKind,
        memberId,
        customerId: family.stripe_customer_id,
      })
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

      await admin
        .from('families')
        .update({
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_status: null,
        })
        .eq('id', familyId)

      session = await createCheckoutSessionViaFetch({
        priceId,
        siteUrl,
        familyId,
        memberKind,
        memberId,
      })
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
