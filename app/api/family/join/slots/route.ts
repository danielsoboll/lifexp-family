import { NextResponse } from 'next/server'

import { fetchClaimableMembersDirect } from '@/lib/family/joinFamilyClaim'
import { createSupabaseServerOnboardingClient } from '@/lib/supabaseServerSession'

export async function POST(request: Request) {
  let body: { inviteCode?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const inviteCode = body.inviteCode ?? ''
  const client = createSupabaseServerOnboardingClient({ mode: 'join', inviteCode })
  const { members, error } = await fetchClaimableMembersDirect(client, inviteCode)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ members })
}
