import { NextResponse } from 'next/server'

import {
  createPlusPortalSessionServer,
  parseBillingSessionBody,
  type BillingSessionBody,
} from '@/lib/family/billingServer'
import { createSupabaseServerSessionClient } from '@/lib/supabaseServerSession'

export async function POST(request: Request) {
  let body: BillingSessionBody
  try {
    body = (await request.json()) as BillingSessionBody
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  try {
    const session = parseBillingSessionBody(body)
    const { url } = await createPlusPortalSessionServer({
      admin: createSupabaseServerSessionClient(session),
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
