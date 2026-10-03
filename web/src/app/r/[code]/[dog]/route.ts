import { NextResponse, type NextRequest } from 'next/server'
import { cleanDogId, rememberInviter } from '@/lib/invite'

/**
 * A dog's page shared by its owner (/r/ABC123/<dog id>): remembers who shared it for 30 days,
 * like any invite link, and opens the dog's page instead of sign-up. Only ever a dog's page.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ code: string; dog: string }> }) {
  const { code, dog } = await ctx.params
  const id = cleanDogId(dog)
  return rememberInviter(NextResponse.redirect(new URL(id ? `/dogs/${id}` : '/dogs', request.url)), code)
}
