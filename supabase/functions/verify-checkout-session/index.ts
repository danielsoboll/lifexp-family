import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import { getStripe, syncFamilyFromCheckoutSession } from '../_shared/billing.ts'
import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // Kein Stripe-Webhook — nur session_id vom Frontend; req.json() ist hier korrekt.
    const body = (await req.json()) as { session_id?: string }
    const sessionId = body.session_id?.trim()
    if (!sessionId) {
      return jsonResponse({ error: 'session_id fehlt.' }, 400)
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const familyId =
      (typeof session.metadata?.family_id === 'string' && session.metadata.family_id) ||
      (typeof session.client_reference_id === 'string' && session.client_reference_id) ||
      ''

    if (!familyId) {
      return jsonResponse({ error: 'Keine Familie in dieser Checkout-Sitzung.' }, 404)
    }

    const memberKind =
      session.metadata?.member_kind === 'parent' || session.metadata?.member_kind === 'child'
        ? session.metadata.member_kind
        : null
    const memberId =
      typeof session.metadata?.member_id === 'string' ? session.metadata.member_id : null

    if (session.status !== 'complete') {
      return jsonResponse({ error: 'Checkout noch nicht abgeschlossen.' }, 409)
    }

    const paymentStatus = session.payment_status ?? 'unpaid'
    if (paymentStatus !== 'paid' && paymentStatus !== 'no_payment_required') {
      return jsonResponse({ error: 'Zahlung noch nicht abgeschlossen.' }, 409)
    }

    const admin = getServiceClient()
    const { synced } = await syncFamilyFromCheckoutSession(admin, session)

    return jsonResponse({
      family_id: familyId,
      member_kind: memberKind,
      member_id: memberId,
      payment_status: paymentStatus,
      status: session.status,
      plus_synced: synced,
    })
  } catch (error) {
    console.error('verify-checkout-session', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      500,
    )
  }
})
