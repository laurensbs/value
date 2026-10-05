import { NextResponse, type NextRequest } from 'next/server'
import { rememberInviter } from '@/lib/invite'

/** Invite links (/r/ABC123) remember who invited someone for 30 days, then open sign-up. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const target = new URL('/signup', request.url)
  const intent = request.nextUrl.searchParams.get('intent')
  if (intent) target.searchParams.set('intent', intent)
  return rememberInviter(NextResponse.redirect(target), code)
}
