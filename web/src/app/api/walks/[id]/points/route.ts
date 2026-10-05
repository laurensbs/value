import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isValidLatLng } from '@/lib/geo'
import { LIVE_LOCATION_HEADER, liveLocationFor } from '@/lib/live-location'
import { walkHasLiveLocation } from '@/lib/rules'
import { fail, json } from '@/server/api'
import { getViewer } from '@/server/session'
import { checkOverdue, walkAccess } from '@/server/walks'

const bodySchema = z.object({
  points: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        accuracy: z.number().nonnegative().max(10_000).optional(),
        t: z.number().int(),
      }),
    )
    .min(1)
    .max(120),
})

/**
 * The walker's phone posts GPS fixes here while a walk is active. Only a walk alone with the dog, with
 * live location switched on (LIVE_LOCATION), collects location (lib/rules.ts walkHasLiveLocation). For
 * a first meeting, or with the switch off, nothing is stored: 403 `live-location-off`, on which the
 * website's tracker stops sending.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewer = await getViewer()
  if (!viewer) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 })
  const access = await walkAccess(id, viewer)
  if (!access?.isWalker) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if (access.walk.status !== 'active') return NextResponse.json({ status: access.walk.status })
  const switchedOn = liveLocationFor(process.env, request.headers.get(LIVE_LOCATION_HEADER))
  if (!walkHasLiveLocation(access.kind, switchedOn)) {
    if (!switchedOn) return fail('live-location-off', 403)
    // A first meeting: the same code, with the reason that fits (they walk together).
    return json({ error: 'live-location-off', message: (await getTranslations('walk'))('together') }, 403)
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const now = Date.now()
  const points = parsed.data.points
    .filter((p) => isValidLatLng(p.lat, p.lng) && (p.accuracy ?? 0) <= 200)
    // Ignore fixes from before the walk or from the future (clock skew of 2 min allowed).
    .filter((p) => p.t >= access.walk.startedAt.getTime() - 60_000 && p.t <= now + 120_000)
  if (points.length > 0) {
    const db = await getDb()
    await db.insert(s.walkPoint).values(
      points.map((p) => ({ walkId: id, lat: p.lat, lng: p.lng, accuracy: p.accuracy ?? null, recordedAt: new Date(p.t) })),
    )
    const last = points[points.length - 1]
    await db.update(s.walk).set({ lastLat: last.lat, lastLng: last.lng, lastAt: new Date(last.t) }).where(eq(s.walk.id, id))
  }
  // Only a walk that shares location gets here (the check above).
  const overdue = await checkOverdue(access.walk, access.dog, true)
  return NextResponse.json({ status: 'active', accepted: points.length, overdueMin: overdue })
}
