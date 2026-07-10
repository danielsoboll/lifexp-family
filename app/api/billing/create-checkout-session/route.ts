import { NextResponse } from 'next/server'

import { createFamilyCheckoutSession, readBillingEnv } from '@/lib/family/billingServer'
import type { FamilySessionMemberKind } from '@/lib/familySession'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

type CheckoutBody = {
  family_id?: string
  member_kind?: FamilySessionMemberKind
  member_id?: string
  site_url?: string
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json(
      {
        error:
          'SUPABASE_SERVICE_ROLE_KEY fehlt — in Vercel Environment Variables setzen (Supabase → Settings → API → service_role).',
      },
      { status: 503 },
    )
  }

  let body: CheckoutBody
  try {
    body = (await request.json()) as CheckoutBody
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 })
  }

  const familyId = body.family_id?.trim()
  const memberId = body.member_id?.trim()
  const memberKind = body.member_kind

  if (!familyId) {
    return NextResponse.json({ error: 'family_id fehlt.' }, { status: 400 })
  }
  if (!memberId || (memberKind !== 'parent' && memberKind !== 'child')) {
    return NextResponse.json({ error: 'member_kind und member_id sind erforderlich.' }, { status: 400 })
  }

  try {
    const env = readBillingEnv(request, body.site_url)
    const result = await createFamilyCheckoutSession(admin, env, {
      familyId,
      memberKind,
      memberId,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('create-checkout-session', error)
    const message = error instanceof Error ? error.message : 'Checkout fehlgeschlagen.'
    const status = message.includes('Nur Familien-Admins') || message.includes('Kein Zugriff') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
