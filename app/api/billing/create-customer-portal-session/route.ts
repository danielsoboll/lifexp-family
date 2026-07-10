import { NextResponse } from 'next/server'

import { createFamilyPortalSession, readBillingEnv } from '@/lib/family/billingServer'
import type { FamilySessionMemberKind } from '@/lib/familySession'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

type PortalBody = {
  family_id?: string
  member_kind?: FamilySessionMemberKind
  member_id?: string
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

  let body: PortalBody
  try {
    body = (await request.json()) as PortalBody
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
    const env = readBillingEnv(request)
    const result = await createFamilyPortalSession(admin, env, {
      familyId,
      memberKind,
      memberId,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('create-customer-portal-session', error)
    const message = error instanceof Error ? error.message : 'Portal fehlgeschlagen.'
    const status = message.includes('Nur Familien-Admins') || message.includes('Kein Zugriff') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
