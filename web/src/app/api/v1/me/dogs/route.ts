import { and, desc, eq, max, min, sql, sum } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { apiMember, dogLook, json } from '@/server/api'

/**
 * The walker's "hondenvriendenboek": every dog they finished a walk with, how often,
 * how far in total and when last. Only the walker's own walks; nothing about the owner.
 */
export async function GET() {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const db = await getDb()
  const rows = await db
    .select({
      dog: s.dog,
      walks: sql<number>`count(*)`.mapWith(Number),
      meters: sum(s.walk.distanceM).mapWith(Number),
      last: max(s.walk.endedAt),
      first: min(s.walk.startedAt),
    })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .where(and(eq(s.walk.walkerId, viewer.userId), eq(s.walk.status, 'ended')))
    .groupBy(s.dog.id)
    .orderBy(desc(max(s.walk.endedAt)))
  return json({
    dogs: rows.map((r) => ({
      id: r.dog.id,
      name: r.dog.name,
      breed: r.dog.breed,
      city: r.dog.city,
      photos: r.dog.photos,
      look: dogLook(r.dog),
      walks: r.walks,
      meters: r.meters ?? 0,
      lastAt: r.last,
      firstAt: r.first,
    })),
  })
}
