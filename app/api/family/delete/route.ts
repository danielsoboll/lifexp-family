import { NextResponse } from 'next/server'

import {
  assertFamilyDeleteAuthorized,
  deleteFamilyCascadeDirect,
} from '@/lib/family/deleteFamilyCascade'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY fehlt — Familie kann nicht gelöscht werden.' },
      { status: 503 },
    )
  }

  let body: { familyId?: string; memberId?: string; memberKind?: 'parent' | 'child' }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const familyId = body.familyId?.trim()
  const memberId = body.memberId?.trim()
  const memberKind = body.memberKind

  if (!familyId || !memberId || (memberKind !== 'parent' && memberKind !== 'child')) {
    return NextResponse.json({ error: 'Session-Daten fehlen.' }, { status: 400 })
  }

  const authError = await assertFamilyDeleteAuthorized(admin, familyId, memberKind, memberId)
  if (authError.error) {
    return NextResponse.json({ error: authError.error.message }, { status: 403 })
  }

  const { error } = await deleteFamilyCascadeDirect(admin, familyId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
