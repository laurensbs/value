import 'server-only'
import { and, count, eq, gte, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'

const DAY = 24 * 60 * 60_000

/**
 * The numbers from docs/MARKETING.md that the admin page can show by itself. The main one is
 * walks of steady pairs: a walker and a dog with at least 3 walks together in the last 8 weeks.
 */
export async function growthKpis(now = new Date()) {
  const db = await getDb()
  const weekAgo = new Date(now.getTime() - 7 * DAY)
  const eightWeeksAgo = new Date(now.getTime() - 56 * DAY)
  const fourWeeksAgo = new Date(now.getTime() - 28 * DAY)
  const real = and(eq(s.dog.status, 'active'), eq(s.dog.isDemo, false))

  const [[ownerDogs], [shelterDogs], [sheltersLive], [newPeople], [walksWeek], [signupsWeek], [tipsWeek]] = await Promise.all([
    db.select({ n: count() }).from(s.dog).where(and(real, isNull(s.dog.orgId))),
    db.select({ n: count() }).from(s.dog).where(and(real, isNotNull(s.dog.orgId))),
    db.select({ n: count() }).from(s.organization).where(and(eq(s.organization.status, 'verified'), eq(s.organization.isDemo, false))),
    db.select({ n: count() }).from(s.profile).where(gte(s.profile.createdAt, weekAgo)),
    db.select({ n: count() }).from(s.walk).where(and(eq(s.walk.status, 'ended'), gte(s.walk.endedAt, weekAgo))),
    db.select({ n: count() }).from(s.groupWalkSignup).where(gte(s.groupWalkSignup.createdAt, weekAgo)),
    db.select({ n: count() }).from(s.suggestion).where(gte(s.suggestion.createdAt, weekAgo)),
  ])

  // Steady pairs and their walks this week.
  const pairs = await db
    .select({ walkerId: s.walk.walkerId, dogId: s.walk.dogId })
    .from(s.walk)
    .where(and(eq(s.walk.status, 'ended'), gte(s.walk.endedAt, eightWeeksAgo)))
    .groupBy(s.walk.walkerId, s.walk.dogId)
    .having(gte(count(), 3))
  const steady = new Set(pairs.map((p) => `${p.walkerId}:${p.dogId}`))
  const recent = await db
    .select({ walkerId: s.walk.walkerId, dogId: s.walk.dogId })
    .from(s.walk)
    .where(and(eq(s.walk.status, 'ended'), gte(s.walk.endedAt, weekAgo)))
  const steadyWalksWeek = recent.filter((w) => steady.has(`${w.walkerId}:${w.dogId}`)).length

  // How full group walks were in the last four weeks (places taken / places offered).
  const pastWalks = await db
    .select({
      capacity: s.groupWalk.capacity,
      taken: sql<number>`(select count(*) from ${s.groupWalkSignup} where ${s.groupWalkSignup.groupWalkId} = ${s.groupWalk.id} and ${s.groupWalkSignup.status} in ('booked','attended'))`.mapWith(Number),
    })
    .from(s.groupWalk)
    .where(and(inArray(s.groupWalk.status, ['scheduled']), gte(s.groupWalk.startsAt, fourWeeksAgo), lt(s.groupWalk.startsAt, now)))
  const offered = pastWalks.reduce((n, w) => n + w.capacity, 0)
  const taken = pastWalks.reduce((n, w) => n + Math.min(w.taken, w.capacity), 0)

  return {
    dogsOnline: ownerDogs.n + shelterDogs.n,
    ownerDogs: ownerDogs.n,
    shelterDogs: shelterDogs.n,
    sheltersLive: sheltersLive.n,
    newPeopleWeek: newPeople.n,
    walksWeek: walksWeek.n,
    steadyPairs: steady.size,
    steadyWalksWeek,
    groupSignupsWeek: signupsWeek.n,
    groupFill: offered ? Math.round((taken / offered) * 100) : null,
    tipsWeek: tipsWeek.n,
  }
}
