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
    const edge = await invokeSupabaseEdgeFunction<{ url?: string }>('create-checkout-session', {
      family_id: session.familyId,
      member_kind: session.memberKind,
      member_id: session.memberId,
      site_url: session.siteUrl,
    })
    if (!edge.url) {
      return NextResponse.json({ error: 'Checkout-URL fehlt.' }, { status: 502 })
    }
    return NextResponse.json({ url: edge.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout fehlgeschlagen.'
    const status = message.includes('Berechtigung') || message.includes('Admins') ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
