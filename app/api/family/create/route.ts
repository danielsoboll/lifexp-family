import { NextResponse } from 'next/server'

import { createFamilyWithMemberDirect } from '@/lib/family/createFamilyDirect'
import type { OnboardingMemberProfile } from '@/lib/family/onboardingMember'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json(
      {
        error:
          'SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local — oder supabase/fix_anon_rls.sql im SQL Editor ausführen.',
      },
      { status: 503 },
    )
  }

  let body: { familyName?: string; profile?: OnboardingMemberProfile }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  if (!body.profile) {
    return NextResponse.json({ error: 'Profil fehlt.' }, { status: 400 })
  }

  const { result, error } = await createFamilyWithMemberDirect(admin, body.familyName ?? '', body.profile)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ result })
}
