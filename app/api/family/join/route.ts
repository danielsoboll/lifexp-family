import { NextResponse } from 'next/server'

import type { ClaimMemberInput } from '@/lib/family/claimableMembers'
import { claimFamilyMemberDirect } from '@/lib/family/joinFamilyClaim'
import { joinFamilyWithInviteCodeDirect } from '@/lib/family/joinFamilyDirect'
import type { OnboardingDevicePrefs, OnboardingMemberProfile } from '@/lib/family/onboardingMember'
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

  let body: {
    inviteCode?: string
    profile?: OnboardingMemberProfile
    claim?: ClaimMemberInput
    devicePrefs?: OnboardingDevicePrefs
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  if (body.claim?.memberId && body.claim.memberKind) {
    const { result, error } = await claimFamilyMemberDirect(
      admin,
      body.inviteCode ?? '',
      body.claim,
      body.devicePrefs,
    )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ result: result?.session, recoveryCode: result?.recoveryCode })
  }

  if (!body.profile) {
    return NextResponse.json({ error: 'Profil fehlt.' }, { status: 400 })
  }

  const { result, error } = await joinFamilyWithInviteCodeDirect(
    admin,
    body.inviteCode ?? '',
    body.profile,
    body.devicePrefs,
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ result: result?.session, recoveryCode: result?.recoveryCode })
}
