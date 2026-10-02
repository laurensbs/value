import { NextResponse } from 'next/server'
import { getViewer } from '@/server/session'
import { checkOverdue, pointsSince, walkAccess } from '@/server/walks'

/** Polled by the owner's live map (and the walker's own screen) every few seconds. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewer = await getViewer()
  if (!viewer) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 })
  const access = await walkAccess(id, viewer)
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const after = Number(new URL(request.url).searchParams.get('after') ?? 0) || 0
  const points = await pointsSince(id, after)
  const overdueMin = await checkOverdue(access.walk, access.dog)
  return NextResponse.json(
    {
      status: access.walk.status,
      startedAt: access.walk.startedAt,
      plannedEndAt: access.walk.plannedEndAt,
      endedAt: access.walk.endedAt,
      lastAt: access.walk.lastAt,
      overdueMin,
      points: points.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, t: p.t.getTime() })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
