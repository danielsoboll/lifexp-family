import { NextResponse } from 'next/server'

import { parseBillingSessionBody, type BillingSessionBody } from '@/lib/family/billingServer'
import { invokeSupabaseEdgeFunction } from '@/lib/supabaseEdgeFunctions'

export async function POST(request: Request) {
  let body: BillingSessionBody
  try {
    body = (await request.json()) as BillingSessionBody
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  try {
    const session = parseBillingSessionBody(body)
    const result = await invokeSupabaseEdgeFunction<{
      synced?: boolean
      subscription_status?: string | null
    }>('sync-family-billing', {
      family_id: session.familyId,
      member_kind: session.memberKind,
      member_id: session.memberId,
    })

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
      subscription_status: result.subscription_status ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
