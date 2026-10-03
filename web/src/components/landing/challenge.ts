import 'server-only'
import { and, eq, gte, lt } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { challengesFrom, monthBounds, type MonthChallenges } from '@/lib/challenges'
import { citySlug } from '@/lib/cities'

/**
 * This month's shared challenge for the public home page: the town with the most walks this month,
 * or everyone together. Same counting as the app (src/server/challenges.ts): finished walks with
 * real dogs, totals only, never who walked.
 */
export async function homeChallenge(now = new Date()): Promise<MonthChallenges> {
  const { previous, start, end } = monthBounds(now)
  const db = await getDb()
  const walks = await db
    .select({ city: s.dog.city, walkerId: s.walk.walkerId, dogId: s.walk.dogId, distanceM: s.walk.distanceM, startedAt: s.walk.startedAt })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .where(and(eq(s.walk.status, 'ended'), eq(s.dog.isDemo, false), gte(s.walk.startedAt, previous), lt(s.walk.startedAt, end)))

  const towns = new Map<string, { name: string; walks: number }>()
  for (const w of walks) {
    const slug = citySlug(w.city)
    if (!slug || w.startedAt < start) continue
    const town = towns.get(slug) ?? { name: w.city.trim(), walks: 0 }
    town.walks += 1
    towns.set(slug, town)
  }
  const busiest = [...towns.values()].sort((a, b) => b.walks - a.walks)[0]
  // No viewer here: an empty id never matches a walker, so "mine" stays 0.
  return challengesFrom(walks, { userId: '', city: busiest?.name ?? '' }, now)
}
