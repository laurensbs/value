import { NextResponse } from 'next/server'
import { LIVE_LOCATION_HEADER, liveLocationFor } from '@/lib/live-location'
import { walkHasLiveLocation } from '@/lib/rules'
import { getViewer } from '@/server/session'
import { checkOverdue, pointsSince, walkAccess, walkPhotos } from '@/server/walks'

/**
 * Polled by the owner's live map (and the walker's own screen) every few seconds. `liveLocation` says
 * whether this walk collects location (lib/rules.ts walkHasLiveLocation): only a walk alone with the dog,
 * with the switch on (LIVE_LOCATION). When false, no new points come in and the screens show no map.
 * `kind` is the kind of walk ('meet' or 'solo', null when its request is gone), so a screen can say why:
 * at a first meeting they walk together.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewer = await getViewer()
  if (!viewer) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 })
  if (viewer.profile?.bannedAt) return NextResponse.json({ error: 'banned' }, { status: 403 })
  const access = await walkAccess(id, viewer)
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const query = new URL(request.url).searchParams
  const after = Number(query.get('after') ?? 0) || 0
  const photosAfter = Number(query.get('photosAfter') ?? 0) || 0
  const points = await pointsSince(id, after)
  const overdueMin = await checkOverdue(access.walk, access.dog)
  const photos = await walkPhotos(id, photosAfter)
  return NextResponse.json(
    {
      status: access.walk.status,
      kind: access.kind,
      liveLocation: walkHasLiveLocation(access.kind, liveLocationFor(process.env, request.headers.get(LIVE_LOCATION_HEADER))),
      startedAt: access.walk.startedAt,
      plannedEndAt: access.walk.plannedEndAt,
      endedAt: access.walk.endedAt,
      lastAt: access.walk.lastAt,
      overdueMin,
      care: { pee: access.walk.pee, poo: access.walk.poo, water: access.walk.water },
      photos: photos.map((p) => ({ id: p.id, url: p.url, t: p.t.getTime() })),
      points: points.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, t: p.t.getTime() })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
