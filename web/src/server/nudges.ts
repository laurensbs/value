import 'server-only'
import { and, desc, eq, gt, gte, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm'
import { getDb, type Db } from '@/db'
import * as s from '@/db/schema'
import { challengesFrom, monthBounds, type ChallengeWalk } from '@/lib/challenges'
import { citySlug } from '@/lib/cities'
import type { NotificationData } from '@/lib/notification-links'
import { NUDGE_KINDS, pickNudge, type Nudge, type NudgeFacts, type NudgeKind } from '@/lib/nudges'
import { ABOUT_MIN_LENGTH, localParts, weekOf } from '@/lib/progress'
import { zonedToUtc } from '@/lib/time'
import { emailEnabled, notificationEmail, sendEmail, toLocale } from './email'
import { canPush, pushNow } from './push'

// Friendly reminders, once a day (Vercel Cron calls /api/cron/nudges). The rules are in
// lib/nudges.ts. This file gathers the facts for everyone who has reminders on, a few hundred
// people per query, and delivers each reminder once: as a push when one of their devices can get
// it, otherwise by email when they allow email. It is also in their notification list.

const DAY = 24 * 60 * 60_000
const CHUNK = 500
const AT_ONCE = 10

export interface NudgeRun {
  /** People with reminders on. */
  people: number
  sent: Partial<Record<NudgeKind, number>>
  pushed: number
  emailed: number
}

type Person = Awaited<ReturnType<typeof peopleWithReminders>>[number]

/**
 * One run: picks and sends today's reminders. Only during the day in the Netherlands, whoever
 * starts it. `skip` is who already heard about an appointment this morning: theirs can wait.
 */
export async function sendNudges(now = new Date(), skip: ReadonlySet<string> = new Set()): Promise<NudgeRun> {
  const run: NudgeRun = { people: 0, sent: {}, pushed: 0, emailed: 0 }
  const hour = localParts(now).hour
  if (hour < 8 || hour >= 21) return run

  const db = await getDb()
  const people = await peopleWithReminders(db)
  run.people = people.length
  const towns = await townWalks(db, now)

  for (let i = 0; i < people.length; i += CHUNK) {
    const chunk = people.slice(i, i + CHUNK)
    const facts = await factsFor(db, chunk, towns, now)
    const picks = chunk.flatMap((person) => {
      if (skip.has(person.userId)) return []
      const f = facts.get(person.userId)!
      const nudge = pickNudge(f.facts, now)
      return nudge ? [{ person, nudge, pushable: f.pushable }] : []
    })
    if (!picks.length) continue
    await db.insert(s.notification).values(
      picks.map(({ person, nudge }) => ({ id: crypto.randomUUID(), userId: person.userId, kind: nudge.kind, data: nudge.data, createdAt: now })),
    )
    for (let j = 0; j < picks.length; j += AT_ONCE) {
      const results = await Promise.all(picks.slice(j, j + AT_ONCE).map((p) => deliver(db, p.person, p.nudge, p.pushable)))
      for (const r of results) {
        if (r === 'push') run.pushed++
        if (r === 'email') run.emailed++
      }
    }
    for (const { nudge } of picks) run.sent[nudge.kind] = (run.sent[nudge.kind] ?? 0) + 1
  }
  return run
}

async function deliver(db: Db, person: Person, nudge: Nudge, pushable: boolean): Promise<'push' | 'email' | null> {
  const data = nudge.data as NotificationData
  try {
    if (pushable) {
      await pushNow(db, [person.userId], nudge.kind, data)
      return 'push'
    }
    if (emailEnabled() && person.wantsEmail) {
      const email = await notificationEmail(nudge.kind, data, toLocale(person.locale), person.email)
      if (email && (await sendEmail(email))) return 'email'
    }
  } catch (error) {
    console.error('[nudges] could not deliver', error)
  }
  return null
}

function peopleWithReminders(db: Db) {
  return db
    .select({
      userId: s.profile.userId,
      email: s.user.email,
      locale: s.profile.locale,
      wantsEmail: s.profile.emailNotifications,
      joinedAt: s.profile.createdAt,
      wantsToWalk: s.profile.wantsToWalk,
      hasDogs: s.profile.hasDogs,
      weeklyGoal: s.profile.weeklyGoal,
      city: s.profile.city,
      about: sql<boolean>`(${s.profile.photoUrl} is not null and length(trim(${s.profile.bio})) >= ${ABOUT_MIN_LENGTH})`,
      quiz: sql<boolean>`(${s.profile.quizPassedAt} is not null)`,
      staff: sql<boolean>`exists (select 1 from organization_member m where m.user_id = profile.user_id)`,
    })
    .from(s.profile)
    .innerJoin(s.user, eq(s.user.id, s.profile.userId))
    .where(and(eq(s.profile.reminders, true), isNull(s.profile.bannedAt)))
    .orderBy(s.profile.userId)
}

/** This month's and last month's walks, by town, for the town challenges. */
async function townWalks(db: Db, now: Date): Promise<Map<string, ChallengeWalk[]>> {
  const { previous, end } = monthBounds(now)
  const walks = await db
    .select({ city: s.dog.city, walkerId: s.walk.walkerId, dogId: s.walk.dogId, distanceM: s.walk.distanceM, startedAt: s.walk.startedAt })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .where(and(eq(s.walk.status, 'ended'), eq(s.dog.isDemo, false), gte(s.walk.startedAt, previous), lt(s.walk.startedAt, end)))
  const towns = new Map<string, ChallengeWalk[]>()
  for (const w of walks) {
    const slug = citySlug(w.city)
    if (!slug) continue
    const list = towns.get(slug)
    if (list) list.push(w)
    else towns.set(slug, [w])
  }
  return towns
}

/** The local start of this week (Monday) and of the next one. */
function weekBounds(now: Date): { start: Date; end: Date } {
  const monday = weekOf(now)
  const next = new Date(Date.parse(`${monday}T12:00:00Z`) + 7 * DAY).toISOString().slice(0, 10)
  return { start: zonedToUtc(monday, '00:00'), end: zonedToUtc(next, '00:00') }
}

async function factsFor(db: Db, people: Person[], towns: Map<string, ChallengeWalk[]>, now: Date) {
  const ids = people.map((p) => p.userId)
  const week = weekBounds(now)
  const [walks, requests, dogs, favourites, sent, devices] = await Promise.all([
    db
      .select({
        userId: s.walk.walkerId,
        walks: sql<number>`count(*)`.mapWith(Number),
        lastAt: sql<Date>`max(${s.walk.startedAt})`.mapWith(s.walk.startedAt),
        thisWeek: sql<number>`count(*) filter (where ${gte(s.walk.startedAt, week.start)})`.mapWith(Number),
      })
      .from(s.walk)
      .where(and(inArray(s.walk.walkerId, ids), eq(s.walk.status, 'ended')))
      .groupBy(s.walk.walkerId),
    db
      .select({
        userId: s.walkRequest.walkerId,
        planned: sql<boolean>`bool_or(${and(inArray(s.walkRequest.status, ['pending', 'accepted']), gt(s.walkRequest.startsAt, now))})`,
        thisWeek: sql<number>`count(*) filter (where ${and(eq(s.walkRequest.status, 'accepted'), gt(s.walkRequest.startsAt, now), lt(s.walkRequest.startsAt, week.end))})`.mapWith(Number),
      })
      .from(s.walkRequest)
      .where(inArray(s.walkRequest.walkerId, ids))
      .groupBy(s.walkRequest.walkerId),
    db
      .select({
        userId: s.dog.ownerId,
        id: s.dog.id,
        name: s.dog.name,
        since: s.dog.createdAt,
        // Written out in full: in a query on one table, drizzle leaves out the table name.
        quiet: sql<boolean>`(dog.status = 'active' and dog.org_id is null and not exists (select 1 from walk_request r where r.dog_id = dog.id))`,
        photos: sql<number>`cardinality(dog.photos)`.mapWith(Number),
        slots: sql<number>`(select count(*) from dog_slot sl where sl.dog_id = dog.id)`.mapWith(Number),
      })
      .from(s.dog)
      .where(and(inArray(s.dog.ownerId, ids), eq(s.dog.isDemo, false)))
      .orderBy(s.dog.createdAt),
    // The dog each walker walked most that can still be walked (not their own).
    db
      .selectDistinctOn([s.walk.walkerId], { userId: s.walk.walkerId, id: s.dog.id, name: s.dog.name })
      .from(s.walk)
      .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
      .where(
        and(
          inArray(s.walk.walkerId, ids),
          eq(s.walk.status, 'ended'),
          eq(s.dog.status, 'active'),
          eq(s.dog.isDemo, false),
          or(isNull(s.dog.ownerId), ne(s.dog.ownerId, s.walk.walkerId)),
        ),
      )
      .groupBy(s.walk.walkerId, s.dog.id, s.dog.name)
      .orderBy(s.walk.walkerId, desc(sql`count(*)`), desc(sql`max(${s.walk.startedAt})`)),
    db
      .select({ userId: s.notification.userId, kind: s.notification.kind, at: s.notification.createdAt, data: s.notification.data })
      .from(s.notification)
      .where(
        and(
          inArray(s.notification.userId, ids),
          inArray(s.notification.kind, [...NUDGE_KINDS]),
          gt(s.notification.createdAt, new Date(now.getTime() - 400 * DAY)),
        ),
      ),
    db.select({ userId: s.pushDevice.userId, kind: s.pushDevice.kind }).from(s.pushDevice).where(inArray(s.pushDevice.userId, ids)),
  ])

  const one = <T extends { userId: string | null }>(rows: T[]) => new Map(rows.map((r) => [r.userId!, r]))
  const many = <T extends { userId: string | null }>(rows: T[]) => {
    const map = new Map<string, T[]>()
    for (const r of rows) {
      const list = map.get(r.userId!)
      if (list) list.push(r)
      else map.set(r.userId!, [r])
    }
    return map
  }
  const walksOf = one(walks)
  const requestsOf = one(requests)
  const favouriteOf = one(favourites)
  const dogsOf = many(dogs)
  const sentOf = many(sent)
  const devicesOf = many(devices)

  const result = new Map<string, { facts: NudgeFacts; pushable: boolean }>()
  for (const p of people) {
    const w = walksOf.get(p.userId)
    const r = requestsOf.get(p.userId)
    const own = dogsOf.get(p.userId) ?? []
    const quiet = own.find((d) => d.quiet)
    const fav = favouriteOf.get(p.userId)
    const slug = citySlug(p.city)
    const town = slug ? challengesFrom(towns.get(slug) ?? [], { userId: p.userId, city: p.city }, now).city : null
    const facts: NudgeFacts = {
      // Shelter staff are not asked to walk unless they said they want to.
      roles: { walker: p.wantsToWalk || (!p.hasDogs && !p.staff && own.length === 0), owner: p.hasDogs || own.length > 0 },
      joinedAt: p.joinedAt,
      weeklyGoal: p.weeklyGoal,
      walks: w?.walks ?? 0,
      lastWalkAt: w?.lastAt ?? null,
      walksThisWeek: w?.thisWeek ?? 0,
      plannedThisWeek: r?.thisWeek ?? 0,
      planned: Boolean(r?.planned),
      steps: { about: Boolean(p.about), dog: own.length > 0, quiz: Boolean(p.quiz), meet: Boolean(r) },
      challenge: town && { city: town.name, goal: town.goal, walks: town.walks, mine: town.mine, done: town.done },
      favouriteDog: fav ? { id: fav.id, name: fav.name } : null,
      quietDog: quiet ? { id: quiet.id, name: quiet.name, since: quiet.since, photos: quiet.photos, slots: quiet.slots } : null,
      sent: (sentOf.get(p.userId) ?? []).map((n) => ({ kind: n.kind, at: n.at, data: (n.data ?? {}) as { step?: string; tip?: string } })),
    }
    result.set(p.userId, { facts, pushable: (devicesOf.get(p.userId) ?? []).some((d) => canPush(d.kind)) })
  }
  return result
}
