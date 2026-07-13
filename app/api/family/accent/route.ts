import { NextResponse } from 'next/server'

import { assertFamilyAdminAuthorized } from '@/lib/family/deleteFamilyCascade'
import { normalizeMemberAccentKey } from '@/lib/family/memberAccentColor'
import { createSupabaseServerSessionClient } from '@/lib/supabaseServerSession'

export async function POST(request: Request) {
  let body: {
    familyId?: string
    memberId?: string
    memberKind?: 'parent' | 'child'
    accentKey?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const familyId = body.familyId?.trim()
  const memberId = body.memberId?.trim()
  const memberKind = body.memberKind
  const accentKey = normalizeMemberAccentKey(body.accentKey)

  if (!familyId || !memberId || (memberKind !== 'parent' && memberKind !== 'child')) {
    return NextResponse.json({ error: 'Session-Daten fehlen.' }, { status: 400 })
  }

  const db = createSupabaseServerSessionClient({ familyId, memberId, memberKind })

  const authError = await assertFamilyAdminAuthorized(db, familyId, memberKind, memberId)
  if (authError.error) {
    return NextResponse.json({ error: authError.error.message }, { status: 403 })
  }

  const { data, error } = await db
    .from('families')
    .update({ accent_key: accentKey, updated_at: new Date().toISOString() })
    .eq('id', familyId)
    .select('accent_key')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Familie nicht gefunden.' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, accent_key: accentKey })
}
