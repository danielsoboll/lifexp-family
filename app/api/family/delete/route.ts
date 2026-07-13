import { NextResponse } from 'next/server'

import {
  assertFamilyAdminAuthorized,
  deleteFamilyCascadeDirect,
} from '@/lib/family/deleteFamilyCascade'
import { createSupabaseServerSessionClient } from '@/lib/supabaseServerSession'

export async function POST(request: Request) {
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

  const db = createSupabaseServerSessionClient({ familyId, memberId, memberKind })

  const authError = await assertFamilyAdminAuthorized(db, familyId, memberKind, memberId)
  if (authError.error) {
    return NextResponse.json({ error: authError.error.message }, { status: 403 })
  }

  const { error } = await deleteFamilyCascadeDirect(db, familyId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
