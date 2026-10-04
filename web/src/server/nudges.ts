import 'server-only'
import { and, desc, eq, gt, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { getDb, type Db } from '@/db'
import * as s from '@/db/schema'
import { challengesFrom, monthBounds, type ChallengeWalk } from '@/lib/challenges'
import { citySlug } from '@/lib/cities'
import type { NotificationData } from '@/lib/notification-links'
import { ignoredInARow, NEW_DOG_DAYS, newDogsNear, pickNudge, sentTooRecently, type NewDog, type Nudge, type NudgeFacts, type NudgeKind, type SentNudge } from '@/lib/nudges'
import { ABOUT_MIN_LENGTH, localParts } from '@/lib/progress'
import { emailEnabled, notificationEmail, sendEmail, toLocale } from './email'
import { canPush, pushNow } from './push'
import { seintjeKind, walkersNear } from './queries'

// Seintjes, once a day (Vercel Cron calls /api/cron/nudges). The rules are in lib/nudges.ts. This
// file gathers the facts for everyone with seintjes on (and no iPhone that plans its own), a few
// hundred people per query, and delivers each seintje once: as a push when one of their devices
// can get it, otherwise by email when they allow email. It is also in their notification list.
// After three in a row with nothing done, it turns their seintjes off (the app says so in one line
// on /notifications). Two runs at the same time (a scheduled call delivered twice) send nobody two.

const DAY = 24 * 60 * 60_000
const CHUNK = 500
const AT_ONCE = 10
/** pg_advisory_xact_lock key for writing seintjes (the migrations use 727272). */
const NUDGE_LOCK = 727273

export interface NudgeRun {
  /** People with seintjes on. */
  people: number
  sent: Partial<Record<NudgeKind, number>>
  pushed: number
  emailed: number
  /** People whose seintjes stopped today: three in a row and nothing done. */
  stopped: number
}

type Person = Awaited<ReturnType<typeof peopleWithReminders>>[number]

/**
 * One run: picks and sends today's seintjes. Only during the day in the Netherlands, whoever
 * starts it. `skip` is who already heard about an appointment this morning: theirs can wait.
 */
export async function sendNudges(now = new Date(), skip: ReadonlySet<string> = new Set()): Promise<NudgeRun> {
  const run: NudgeRun = { people: 0, sent: {}, pushed: 0, emailed: 0, stopped: 0 }
  const hour = localParts(now).hour
  if (hour < 8 || hour >= 21) return run

  const db = await getDb()
  const people = await peopleWithReminders(db)
  run.people = people.length
  const [towns, fresh] = await Promise.all([townWalks(db, now), newDogs(db, now)])

  for (let i = 0; i < people.length; i += CHUNK) {
    const chunk = people.slice(i, i + CHUNK)
    const facts = await factsFor(db, chunk, towns, fresh, now)
    const stop: Person[] = []
    const picks = chunk.flatMap((person) => {
      const f = facts.get(person.userId)!
      if (ignoredInARow(f.facts.sent, f.facts.lastActiveAt, now)) {
        stop.push(person)
        return []
      }
      if (skip.has(person.userId)) return []
      const nudge = pickNudge(f.facts, now)
      return nudge ? [{ person, nudge, pushable: f.pushable }] : []
    })
    // Three in a row and nothing done: the switch goes off, quietly. Keeping updated_at as it was
    // keeps this from counting as something the person did (and /notifications can say why).
    for (const person of stop) {
      await db
        .update(s.profile)
        .set({ reminders: false, updatedAt: person.updatedAt })
        .where(and(eq(s.profile.userId, person.userId), eq(s.profile.reminders, true)))
    }
    run.stopped += stop.length
    if (!picks.length) continue
    // One run at a time from here: whoever comes second sees the seintjes the first one just wrote
    // and leaves those people out, so a call delivered twice never sends anyone two.
    const going = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${NUDGE_LOCK})`)
      const recent = await tx
        .select({ userId: s.notification.userId, kind: s.notification.kind, at: s.notification.createdAt })
        .from(s.notification)
        .where(
          and(
            inArray(
              s.notification.userId,
              picks.map((p) => p.person.userId),
            ),
            seintjeKind,
            gt(s.notification.createdAt, new Date(now.getTime() - 8 * DAY)),
          ),
        )
      const tooSoon = new Set(recent.filter((r) => sentTooRecently([{ kind: r.kind, at: r.at, data: {} }], now)).map((r) => r.userId))
      const go = picks.filter((p) => !tooSoon.has(p.person.userId))
      if (go.length) {
        await tx
          .insert(s.notification)
          .values(go.map(({ person, nudge }) => ({ id: crypto.randomUUID(), userId: person.userId, kind: nudge.kind, data: nudge.data, createdAt: now })))
      }
      return go
    })
    for (let j = 0; j < going.length; j += AT_ONCE) {
      const results = await Promise.all(going.slice(j, j + AT_ONCE).map((p) => deliver(db, p.person, p.nudge, p.pushable)))
      for (const r of results) {
        if (r === 'push') run.pushed++
        if (r === 'email') run.emailed++
      }
    }
    for (const { nudge } of going) run.sent[nudge.kind] = (run.sent[nudge.kind] ?? 0) + 1
  }
  return run
}

/** As a push to the devices that can get one, else by email. */
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
      updatedAt: s.profile.updatedAt,
      wantsToWalk: s.profile.wantsToWalk,
      hasDogs: s.profile.hasDogs,
      country: s.profile.country,
      city: s.profile.city,
      lat: s.profile.lat,
      lng: s.profile.lng,
      pppLicense: s.profile.pppLicense,
      about: sql<boolean>`(${s.profile.photoUrl} is not null and length(trim(${s.profile.bio})) >= ${ABOUT_MIN_LENGTH})`,
      quiz: sql<boolean>`(${s.profile.quizPassedAt} is not null)`,
      staff: sql<boolean>`exists (select 1 from organization_member m where m.user_id = profile.user_id)`,
    })
    .from(s.profile)
    .innerJoin(s.user, eq(s.user.id, s.profile.userId))
    // An iPhone that plans its own seintjes (localNudges): the server sends that person none at all.
    .where(and(eq(s.profile.reminders, true), eq(s.profile.localNudges, false), isNull(s.profile.bannedAt)))
    .orderBy(s.profile.userId)
}

/**
 * When each of these people last did something themselves: asked for a walk, walked, wrote a
 * message, joined a group walk, gave feedback, changed a dog or their profile (switches included).
 * Built from what is there anyway; nothing about opening the app or a notification is stored.
 */
export async function lastActive(db: Db, ids: string[]): Promise<Map<string, Date>> {
  if (!ids.length) return new Map()
  const rows = await db
    .select({
      userId: s.profile.userId,
      // Written out in full: in a query on one table, drizzle leaves out the table name.
      at: sql<Date>`greatest(
        profile.updated_at,
        (select max(r.created_at) from walk_request r where r.walker_id = profile.user_id),
        (select max(w.started_at) from walk w where w.walker_id = profile.user_id),
        (select max(d.updated_at) from dog d where d.owner_id = profile.user_id),
        (select max(m.created_at) from chat_message m where m.sender_id = profile.user_id),
        (select max(g.created_at) from group_walk_signup g where g.user_id = profile.user_id),
        (select max(f.created_at) from feedback f where f.from_user_id = profile.user_id)
      )`.mapWith(s.profile.updatedAt),
    })
    .from(s.profile)
    .where(inArray(s.profile.userId, ids))
  return new Map(rows.map((r) => [r.userId, r.at]))
}

/** Seintjes sent to these people in the last year, every kind (also ones no longer sent). */
function sentTo(db: Db, ids: string[], now: Date) {
  return db
    .select({ userId: s.notification.userId, kind: s.notification.kind, at: s.notification.createdAt, data: s.notification.data })
    .from(s.notification)
    .where(and(inArray(s.notification.userId, ids), seintjeKind, gt(s.notification.createdAt, new Date(now.getTime() - 400 * DAY))))
}

/**
 * True when this person's seintjes went off by themselves (three in a row, nothing done since) and
 * they did nothing since: then /notifications says so in one line. Turning them off yourself
 * counts as doing something, so that never shows this line.
 */
export async function seintjesStopped(userId: string, reminders: boolean, now = new Date()): Promise<boolean> {
  if (reminders) return false
  const db = await getDb()
  const [sent, active] = await Promise.all([sentTo(db, [userId], now), lastActive(db, [userId])])
  const nudges = sent.map((n) => ({ kind: n.kind, at: n.at, data: (n.data ?? {}) as SentNudge['data'] }))
  return ignoredInARow(nudges, active.get(userId) ?? null, now)
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

/** Private owners' dogs that came online in the last few days, newest first. */
async function newDogs(db: Db, now: Date): Promise<NewDog[]> {
  const rows = await db
    .select({ id: s.dog.id, name: s.dog.name, ownerId: s.dog.ownerId, country: s.dog.country, city: s.dog.city, lat: s.dog.lat, lng: s.dog.lng, ppp: s.dog.ppp })
    .from(s.dog)
    .where(
      and(
        eq(s.dog.status, 'active'),
        eq(s.dog.isDemo, false),
        isNull(s.dog.orgId),
        gt(s.dog.createdAt, new Date(now.getTime() - NEW_DOG_DAYS * DAY)),
      ),
    )
    .orderBy(desc(s.dog.createdAt))
    .limit(2000)
  return rows.flatMap((d) =>
    d.ownerId ? [{ id: d.id, name: d.name, ownerId: d.ownerId, country: d.country, town: citySlug(d.city), lat: d.lat, lng: d.lng, ppp: d.ppp }] : [],
  )
}

async function factsFor(db: Db, people: Person[], towns: Map<string, ChallengeWalk[]>, fresh: NewDog[], now: Date) {
  const ids = people.map((p) => p.userId)
  const freshIds = fresh.map((d) => d.id)
  const freshOwners = [...new Set(fresh.map((d) => d.ownerId))]
  const [walks, requested, dogs, sent, active, devices, asked, blocks] = await Promise.all([
    db
      .select({ userId: s.walk.walkerId, walks: sql<number>`count(*)`.mapWith(Number) })
      .from(s.walk)
      .where(and(inArray(s.walk.walkerId, ids), eq(s.walk.status, 'ended')))
      .groupBy(s.walk.walkerId),
    db.selectDistinct({ userId: s.walkRequest.walkerId }).from(s.walkRequest).where(inArray(s.walkRequest.walkerId, ids)),
    db
      .select({
        userId: s.dog.ownerId,
        id: s.dog.id,
        name: s.dog.name,
        since: s.dog.createdAt,
        // Written out in full: in a query on one table, drizzle leaves out the table name.
        quiet: sql<boolean>`(dog.status = 'active' and dog.org_id is null and not exists (select 1 from walk_request r where r.dog_id = dog.id))`,
      })
      .from(s.dog)
      .where(and(inArray(s.dog.ownerId, ids), eq(s.dog.isDemo, false)))
      .orderBy(s.dog.createdAt),
    sentTo(db, ids, now),
    lastActive(db, ids),
    db.select({ userId: s.pushDevice.userId, kind: s.pushDevice.kind }).from(s.pushDevice).where(inArray(s.pushDevice.userId, ids)),
    // For the new dogs: the ones these people asked about already, and blocks between them and the owners.
    fresh.length
      ? db
          .select({ userId: s.walkRequest.walkerId, dogId: s.walkRequest.dogId })
          .from(s.walkRequest)
          .where(and(inArray(s.walkRequest.walkerId, ids), inArray(s.walkRequest.dogId, freshIds)))
      : [],
    fresh.length
      ? db
          .select({ blocker: s.block.blockerId, blocked: s.block.blockedId })
          .from(s.block)
          .where(
            or(
              and(inArray(s.block.blockerId, ids), inArray(s.block.blockedId, freshOwners)),
              and(inArray(s.block.blockedId, ids), inArray(s.block.blockerId, freshOwners)),
            ),
          )
      : [],
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
  const requestedBy = new Set(requested.map((r) => r.userId))
  const dogsOf = many(dogs)
  const sentOf = many(sent)
  const devicesOf = many(devices)
  const askedOf = new Map<string, Set<string>>()
  const blockedOf = new Map<string, Set<string>>()
  const add = (map: Map<string, Set<string>>, key: string, value: string) => {
    const set = map.get(key)
    if (set) set.add(value)
    else map.set(key, new Set([value]))
  }
  for (const r of asked) add(askedOf, r.userId, r.dogId)
  for (const b of blocks) {
    add(blockedOf, b.blocker, b.blocked)
    add(blockedOf, b.blocked, b.blocker)
  }
  const none = new Set<string>()

  const result = new Map<string, { facts: NudgeFacts; pushable: boolean }>()
  for (const p of people) {
    const own = dogsOf.get(p.userId) ?? []
    const nudges = (sentOf.get(p.userId) ?? []).map((n) => ({ kind: n.kind, at: n.at, data: (n.data ?? {}) as SentNudge['data'] }))
    const toldDogs = new Set(nudges.filter((n) => n.kind === 'nudge-owner').map((n) => n.data.dogId))
    const quiet = own.find((d) => d.quiet && !toldDogs.has(d.id))
    const slug = citySlug(p.city)
    const town = slug ? challengesFrom(towns.get(slug) ?? [], { userId: p.userId, city: p.city }, now).city : null
    // Shelter staff are not asked to walk unless they said they want to.
    const roles = { walker: p.wantsToWalk || (!p.hasDogs && !p.staff && own.length === 0), owner: p.hasDogs || own.length > 0 }
    const place = { userId: p.userId, country: p.country, town: slug, lat: p.lat, lng: p.lng, pppLicense: p.pppLicense }
    const facts: NudgeFacts = {
      roles,
      joinedAt: p.joinedAt,
      walks: walksOf.get(p.userId)?.walks ?? 0,
      steps: { about: Boolean(p.about), dog: own.length > 0, quiz: Boolean(p.quiz), meet: requestedBy.has(p.userId) },
      challenge: town && { city: town.name, goal: town.goal, walks: town.walks, mine: town.mine, done: town.done },
      newDogs: roles.walker ? newDogsNear(place, fresh, { asked: askedOf.get(p.userId) ?? none, blocked: blockedOf.get(p.userId) ?? none }) : [],
      // How many walkers live nearby: only asked for a quiet dog the owner did not hear about yet.
      quietDog: quiet ? { id: quiet.id, name: quiet.name, since: quiet.since, walkersNear: await walkersNear(p, p.userId) } : null,
      lastActiveAt: active.get(p.userId) ?? null,
      sent: nudges,
    }
    result.set(p.userId, { facts, pushable: (devicesOf.get(p.userId) ?? []).some((d) => canPush(d.kind)) })
  }
  return result
}
