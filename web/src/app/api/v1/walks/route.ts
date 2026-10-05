import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { beginWalk } from '@/server/walks'

/**
 * Start the walk of an accepted appointment (from half an hour before it). `liveLocation` says whether
 * the phone should share its location during this walk: only a walk alone with the dog, with the switch
 * on (lib/rules.ts walkHasLiveLocation). When false, send no points (they would get 403 live-location-off).
 */
export async function POST(request: Request) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as { requestId?: unknown } | null
  if (typeof body?.requestId !== 'string') return fail('invalid')
  const result = await beginWalk(body.requestId, viewer)
  return result.ok ? json({ walkId: result.walkId, liveLocation: Boolean(result.liveLocation) }, 201) : fail(result.error ?? 'invalid')
}
