import { NextResponse } from 'next/server'

import { createFamilyWithMemberDirect } from '@/lib/family/createFamilyDirect'
import type { OnboardingDevicePrefs, OnboardingMemberProfile } from '@/lib/family/onboardingMember'
import { createSupabaseServerOnboardingClient } from '@/lib/supabaseServerSession'

export async function POST(request: Request) {
  let body: { familyName?: string; profile?: OnboardingMemberProfile; devicePrefs?: OnboardingDevicePrefs }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  if (!body.profile) {
    return NextResponse.json({ error: 'Profil fehlt.' }, { status: 400 })
  }

  const client = createSupabaseServerOnboardingClient({ mode: 'create' })
  const { result, error } = await createFamilyWithMemberDirect(
    client,
    body.familyName ?? '',
    body.profile,
    body.devicePrefs,
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ result: result?.session, recoveryCode: result?.recoveryCode })
}
