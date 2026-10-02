import { NextResponse, type NextRequest } from 'next/server'

/** Invite links (/r/ABC123) remember who invited someone for 30 days, then open sign-up. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
  const target = new URL('/signup', request.url)
  const intent = request.nextUrl.searchParams.get('intent')
  if (intent) target.searchParams.set('intent', intent)
  const response = NextResponse.redirect(target)
  if (clean) {
    response.cookies.set('rondje_ref', clean, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax', httpOnly: true })
  }
  return response
}
