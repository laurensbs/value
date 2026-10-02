import { NextResponse, type NextRequest } from 'next/server'

/**
 * Production answers on several hostnames (rondje-five.vercel.app, the team alias,
 * the branch alias). Logins, cookies and passkeys are tied to one origin, so every
 * page request on another production hostname is sent to the canonical one.
 */
export function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.next()
  const explicit = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL
  const canonical = explicit ? new URL(explicit).host : process.env.VERCEL_PROJECT_PRODUCTION_URL
  const host = request.headers.get('host')
  if (!canonical || !host || host === canonical) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.host = canonical
  url.protocol = 'https'
  url.port = ''
  return NextResponse.redirect(url, 308)
}

export const config = {
  // Pages only: API routes (cron, uploads, live tracking) answer on any hostname.
  matcher: ['/((?!api/|_next/|favicon|icon-|apple-touch-icon|og\\.png|manifest).*)'],
}
