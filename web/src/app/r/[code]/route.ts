import { NextResponse, type NextRequest } from 'next/server'
import { cleanInviteCode, INVITE_COOKIE, INVITE_MAX_AGE } from '@/lib/invite'

/** Invite links (/r/ABC123) remember who invited someone for 30 days, then open sign-up. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const clean = cleanInviteCode(code)
  const target = new URL('/signup', request.url)
  const intent = request.nextUrl.searchParams.get('intent')
  if (intent) target.searchParams.set('intent', intent)
  const response = NextResponse.redirect(target)
  if (clean) {
    response.cookies.set(INVITE_COOKIE, clean, { path: '/', maxAge: INVITE_MAX_AGE, sameSite: 'lax', httpOnly: true })
  }
  return response
}
