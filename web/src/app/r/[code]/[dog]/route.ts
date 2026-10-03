import { NextResponse, type NextRequest } from 'next/server'
import { cleanDogId, cleanInviteCode, INVITE_COOKIE, INVITE_MAX_AGE } from '@/lib/invite'

/**
 * A dog's page shared by its owner (/r/ABC123/<dog id>): remembers who shared it for 30 days,
 * like any invite link, and opens the dog's page instead of sign-up. Only ever a dog's page.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ code: string; dog: string }> }) {
  const { code, dog } = await ctx.params
  const clean = cleanInviteCode(code)
  const id = cleanDogId(dog)
  const response = NextResponse.redirect(new URL(id ? `/dogs/${id}` : '/dogs', request.url))
  if (clean) {
    response.cookies.set(INVITE_COOKIE, clean, { path: '/', maxAge: INVITE_MAX_AGE, sameSite: 'lax', httpOnly: true })
  }
  return response
}
