import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Production: CANONICAL_HOST=family.life-xp.de
 * Leitet z. B. *.vercel.app und www. auf die Hauptdomain um.
 */
const CANONICAL_HOST = process.env.CANONICAL_HOST?.trim().toLowerCase()

export function middleware(request: NextRequest) {
  if (!CANONICAL_HOST) return NextResponse.next()

  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase()
  if (!host || host === CANONICAL_HOST) return NextResponse.next()

  const isVercelHost = host.endsWith('.vercel.app')
  const isWwwAlias = host === `www.${CANONICAL_HOST}`

  if (!isVercelHost && !isWwwAlias) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.protocol = 'https'
  url.host = CANONICAL_HOST
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|icons/|avatars/).*)'],
}
