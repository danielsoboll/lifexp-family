import { NextResponse } from 'next/server'

import { parseBillingSessionBody, syncFamilyBillingFromStripeServer, type BillingSessionBody } from '@/lib/family/billingServer'
import { assertFamilyAdminAuthorized } from '@/lib/family/deleteFamilyCascade'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY fehlt — Billing-Sync nicht verfügbar.' },
      { status: 503 },
    )
  }

  let body: BillingSessionBody
  try {
    body = (await request.json()) as BillingSessionBody
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  try {
    const session = parseBillingSessionBody(body)
    const authError = await assertFamilyAdminAuthorized(
      admin,
      session.familyId,
      session.memberKind,
      session.memberId,
    )
    if (authError.error) {
      return NextResponse.json({ error: authError.error.message }, { status: 403 })
    }

    const result = await syncFamilyBillingFromStripeServer(admin, session.familyId)
    if (!result.synced) {
      return NextResponse.json(
        {
          error:
            'Kein Stripe-Abo gefunden. Nach dem Checkout kurz warten oder die Success-Seite erneut öffnen.',
          synced: false,
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      synced: true,
      subscription_status: result.subscriptionStatus,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
