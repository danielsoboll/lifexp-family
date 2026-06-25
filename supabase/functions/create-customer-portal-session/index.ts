import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import {
  assertFamilySessionBillingAdmin,
  fetchFamilyForBilling,
  getSiteUrl,
  getStripe,
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
    getStripe()

    const body = (await req.json()) as {
      family_id?: string
      member_kind?: 'parent' | 'child'
      member_id?: string
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

    if (!family.stripe_customer_id) {
      return jsonResponse({ error: 'Noch kein Stripe-Kunde — zuerst PLUS aktivieren.' }, 400)
    }

    const stripe = getStripe()
    const siteUrl = getSiteUrl(req)
    const portal = await stripe.billingPortal.sessions.create({
      customer: family.stripe_customer_id,
      return_url: `${siteUrl}/admin/settings`,
    })

    return jsonResponse({ url: portal.url })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('create-customer-portal-session', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      500,
    )
  }
})
