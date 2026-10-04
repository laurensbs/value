import 'server-only'
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm'
import { revalidateTag, unstable_cache } from 'next/cache'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { FIRST_COUNTRY, NEWEST_DOGS_LIMIT, newestDogs, type NewestDog } from '@/lib/newest-dogs'

/** The cache tag of the home page's "Net aangemeld" list. */
export const NEWEST_DOGS_TAG = 'newest-dogs'

/** Straight from the database: the newest listable dogs, Netherlands first (lib/newest-dogs.ts). */
export async function queryNewestDogs(limit = NEWEST_DOGS_LIMIT): Promise<NewestDog[]> {
  const db = await getDb()
  const rows = await db
    .select({
      id: s.dog.id,
      name: s.dog.name,
      breed: s.dog.breed,
      city: s.dog.city,
      country: s.dog.country,
      photos: s.dog.photos,
      avatar: s.dog.avatar,
      energy: s.dog.energy,
      walkMinutes: s.dog.walkMinutes,
      status: s.dog.status,
      isDemo: s.dog.isDemo,
      orgId: s.dog.orgId,
      orgStatus: s.organization.status,
      orgIsDemo: s.organization.isDemo,
      createdAt: s.dog.createdAt,
    })
    .from(s.dog)
    .leftJoin(s.organization, eq(s.organization.id, s.dog.orgId))
    .where(
      and(
        eq(s.dog.status, 'active'),
        eq(s.dog.isDemo, false),
        or(isNull(s.dog.orgId), and(eq(s.organization.status, 'verified'), eq(s.organization.isDemo, false))),
      ),
    )
    .orderBy(sql`(${s.dog.country} = ${FIRST_COUNTRY}) desc`, desc(s.dog.createdAt))
    .limit(limit * 2)
  return newestDogs(rows, limit)
}

/**
 * The same list for every visitor, kept for five minutes. Adding, pausing, hiding or deleting a dog
 * on the website clears it at once (dogsChanged); changes from the app show within five minutes.
 */
export const newestRealDogs = unstable_cache(() => queryNewestDogs(), ['newest-real-dogs-v1'], { revalidate: 300, tags: [NEWEST_DOGS_TAG] })

/** Call after a dog was added, changed, paused, hidden or deleted: the next home page asks the database again. */
export function dogsChanged(): void {
  revalidateTag(NEWEST_DOGS_TAG, { expire: 0 })
}
