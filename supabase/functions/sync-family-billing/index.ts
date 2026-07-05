import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import {
  assertFamilySessionBillingAdmin,
  syncFamilyBillingFromStripe,
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

    const result = await syncFamilyBillingFromStripe(admin, familyId)
    if (!result.synced) {
      return jsonResponse(
        {
          error:
            'Kein Stripe-Abo gefunden. Nach dem Checkout kurz warten oder die Success-Seite erneut öffnen.',
          synced: false,
        },
        404,
      )
    }

    return jsonResponse({
      synced: true,
      subscription_status: result.subscriptionStatus,
    })
  } catch (error) {
    if (error instanceof Response) return error
    console.error('sync-family-billing', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen' },
      500,
    )
  }
})
