import { NextResponse } from 'next/server'

import { fetchClaimableMembersDirect } from '@/lib/family/joinFamilyClaim'
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

  let body: { inviteCode?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const { members, error } = await fetchClaimableMembersDirect(admin, body.inviteCode ?? '')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ members })
}
