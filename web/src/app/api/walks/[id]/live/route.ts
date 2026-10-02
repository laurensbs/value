import { NextResponse } from 'next/server'
import { getViewer } from '@/server/session'
import { checkOverdue, pointsSince, walkAccess, walkPhotos } from '@/server/walks'

/** Polled by the owner's live map (and the walker's own screen) every few seconds. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewer = await getViewer()
  if (!viewer) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 })
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
