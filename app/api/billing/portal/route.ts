import { NextResponse } from 'next/server'

import {
  createPlusPortalSessionServer,
  parseBillingSessionBody,
  type BillingSessionBody,
} from '@/lib/family/billingServer'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY fehlt — Abo-Portal nicht verfügbar.' },
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
    const { url } = await createPlusPortalSessionServer({
      admin,
      request,
      familyId: session.familyId,
      memberKind: session.memberKind,
      memberId: session.memberId,
      siteUrl: session.siteUrl,
    })
    return NextResponse.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Portal konnte nicht geöffnet werden.'
    const status = message.includes('Berechtigung') || message.includes('Admins') ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
