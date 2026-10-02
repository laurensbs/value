import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { beginWalk } from '@/server/walks'

/** Start the walk of an accepted appointment (from half an hour before it). */
export async function POST(request: Request) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as { requestId?: unknown } | null
  if (typeof body?.requestId !== 'string') return fail('invalid')
  const result = await beginWalk(body.requestId, viewer)
  return result.ok ? json({ walkId: result.walkId }, 201) : fail(result.error ?? 'invalid')
}
