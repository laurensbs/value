import 'server-only'
import { and, eq, gte, lt } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { challengesFrom, monthBounds, type MonthChallenges } from '@/lib/challenges'
import type { OnboardedViewer } from './session'

/** This month's challenge for the person's town and for everyone, counted from finished walks. */
export async function challengesFor(viewer: OnboardedViewer, now = new Date()): Promise<MonthChallenges> {
  const { previous, end } = monthBounds(now)
  const db = await getDb()
  const walks = await db
    .select({ city: s.dog.city, walkerId: s.walk.walkerId, dogId: s.walk.dogId, distanceM: s.walk.distanceM, startedAt: s.walk.startedAt })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .where(and(eq(s.walk.status, 'ended'), eq(s.dog.isDemo, false), gte(s.walk.startedAt, previous), lt(s.walk.startedAt, end)))
  return challengesFrom(walks, { userId: viewer.userId, city: viewer.profile.city }, now)
}
