import 'server-only'
import { and, desc, eq, max, min, sql, sum } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'

export interface DogFriend {
  dog: { id: string; name: string; photos: string[]; avatar: unknown; breed: string; city: string }
  walks: number
  meters: number
  firstAt: Date | null
  lastAt: Date | null
}

/**
 * The walker's "hondenvriendenboek": every dog they finished a walk with, how often, how far and
 * when. The same query as the iPhone app's /api/v1/me/dogs: only the walker's own walks, nothing
 * about the owner.
 */
export async function dogFriendsOf(userId: string): Promise<DogFriend[]> {
  const db = await getDb()
  const rows = await db
    .select({
      dog: { id: s.dog.id, name: s.dog.name, photos: s.dog.photos, avatar: s.dog.avatar, breed: s.dog.breed, city: s.dog.city },
      walks: sql<number>`count(*)`.mapWith(Number),
      meters: sum(s.walk.distanceM).mapWith(Number),
      last: max(s.walk.endedAt),
      first: min(s.walk.startedAt),
    })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .where(and(eq(s.walk.walkerId, userId), eq(s.walk.status, 'ended')))
    .groupBy(s.dog.id)
    .orderBy(desc(max(s.walk.endedAt)))
  return rows.map((r) => ({ dog: r.dog, walks: r.walks, meters: r.meters ?? 0, firstAt: r.first, lastAt: r.last }))
}
