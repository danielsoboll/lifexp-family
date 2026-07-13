import { NextResponse } from 'next/server'

import { invokeSupabaseEdgeFunction } from '@/lib/supabaseEdgeFunctions'

export async function POST(request: Request) {
  let body: { sessionId?: string }
  try {
    body = (await request.json()) as { sessionId?: string }
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const sessionId = body.sessionId?.trim()
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id fehlt.' }, { status: 400 })
  }

  try {
    const result = await invokeSupabaseEdgeFunction<{
      family_id: string
      member_kind: 'parent' | 'child' | null
      member_id: string | null
      payment_status: string
      status: string
      plus_synced: boolean
    }>('verify-checkout-session', { session_id: sessionId })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout konnte nicht verifiziert werden.'
    const status = message.includes('noch nicht') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
