import 'server-only'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import {
  ABOUT_MIN_LENGTH,
  activeWeeks,
  BADGES,
  badgesFor,
  earnedTiers,
  firstSteps,
  levelFor,
  POINTS,
  statsFrom,
  walksInWeek,
  weekDays,
  type BadgeState,
  type LevelInfo,
  type PointEvent,
  type Roles,
  type Step,
} from '@/lib/progress'
import type { OnboardedViewer } from './session'

// Points are not handed out by every action separately: one statement finds everything someone
// did that earns points and adds what is missing. That also fills in walks from before levels
// existed, and nothing has to remember to award points. Rows are never removed (see the
// point_event table), so deleting a walk or a dog later never takes points away.

const n = (value: number) => sql.raw(String(Math.trunc(value)))

export async function syncPoints(userId: string): Promise<void> {
  const db = await getDb()
  const me = sql`${userId}::text`
  await db.execute(sql`
    insert into point_event (user_id, kind, ref, points, at, meta)
    select ${me}, 'walk', w.id, ${n(POINTS.walk)}, w.started_at, jsonb_build_object('dogId', w.dog_id)
      from walk w where w.walker_id = ${me} and w.status = 'ended'
    union all
    select ${me}, 'walk-care', w.id, ${n(POINTS['walk-care'])}, w.started_at, '{}'::jsonb
      from walk w where w.walker_id = ${me} and w.status = 'ended' and w.pee + w.poo + w.water > 0
    union all
    select ${me}, 'walk-photo', w.id, ${n(POINTS['walk-photo'])}, w.started_at, '{}'::jsonb
      from walk w where w.walker_id = ${me} and w.status = 'ended' and exists (select 1 from walk_photo p where p.walk_id = w.id)
    union all
    select ${me}, 'feedback', f.walk_id, ${n(POINTS.feedback)}, f.created_at, '{}'::jsonb
      from feedback f where f.from_user_id = ${me}
    union all
    select ${me}, 'dog-walked', w.id, ${n(POINTS['dog-walked'])}, w.started_at, jsonb_build_object('dogId', w.dog_id, 'walkerId', w.walker_id)
      from walk w join dog d on d.id = w.dog_id
      where d.owner_id = ${me} and w.status = 'ended' and w.walker_id <> ${me}
    union all
    select ${me}, 'group-walk', g.id, ${n(POINTS['group-walk'])}, g.starts_at, jsonb_build_object('orgId', g.org_id)
      from group_walk_signup su join group_walk g on g.id = su.group_walk_id
      where su.user_id = ${me} and su.status = 'attended'
    union all
    select ${me}, 'quiz', '', ${n(POINTS.quiz)}, p.quiz_passed_at, '{}'::jsonb
      from profile p where p.user_id = ${me} and p.quiz_passed_at is not null
    union all
    select ${me}, 'profile', '', ${n(POINTS.profile)}, now(), '{}'::jsonb
      from profile p where p.user_id = ${me} and p.photo_url is not null and length(trim(p.bio)) >= ${n(ABOUT_MIN_LENGTH)}
    union all
    select ${me}, 'first-dog', '', ${n(POINTS['first-dog'])}, min(d.created_at), '{}'::jsonb
      from dog d where d.owner_id = ${me} and not d.is_demo having count(*) > 0
    union all
    select ${me}, 'invite', r.user_id, ${n(POINTS.invite)}, r.created_at, '{}'::jsonb
      from profile mine join profile r on r.referred_by = mine.referral_code
      where mine.user_id = ${me} and r.user_id <> ${me}
    on conflict do nothing
  `)
}

export interface RecentPoints {
  kind: string
  points: number
  at: Date
  dogName: string | null
}

export interface Progress {
  points: number
  level: LevelInfo
  /** A level was reached that the person has not seen celebrated yet. */
  levelUp: boolean
  roles: Roles
  weeklyGoal: number | null
  walksThisWeek: number
  /** Walks per day this week, Monday first. */
  weekDays: number[]
  /** Weeks with at least one walk, ever. */
  activeWeeks: number
  badges: BadgeState[]
  /** When each earned tier was reached, keyed "key:tier". */
  earnedAt: Record<string, Date>
  /** Earned tiers not celebrated yet. */
  newAwards: { key: string; tier: number }[]
  recent: RecentPoints[]
  steps: Step[]
  /** Points per walk id (the walk itself, report, photo, feedback, or your dog's walk). */
  byWalk: Record<string, number>
}

export function rolesOf(profile: { wantsToWalk: boolean; hasDogs: boolean }): Roles {
  return { walker: profile.wantsToWalk || !profile.hasDogs, owner: profile.hasDogs }
}

/** Everything the progress screens show. Adds missing points and badges first. */
export async function progressFor(viewer: OnboardedViewer, now = new Date()): Promise<Progress> {
  const userId = viewer.userId
  const p = viewer.profile
  await syncPoints(userId)
  const db = await getDb()

  const [rows, awards, [facts], [shareDog]] = await Promise.all([
    db
      .select({ kind: s.pointEvent.kind, ref: s.pointEvent.ref, points: s.pointEvent.points, at: s.pointEvent.at, meta: s.pointEvent.meta })
      .from(s.pointEvent)
      .where(eq(s.pointEvent.userId, userId))
      .orderBy(desc(s.pointEvent.at)),
    // Only badges that still exist: earned tiers of a badge that was taken out stay stored, unseen.
    db
      .select()
      .from(s.award)
      .where(and(eq(s.award.userId, userId), inArray(s.award.key, BADGES.map((b) => b.key)))),
    db.execute<{ requested: boolean; has_dog: boolean; dog_met: boolean }>(sql`
      select
        exists (select 1 from walk_request where walker_id = ${userId}) as requested,
        exists (select 1 from dog where owner_id = ${userId} and not is_demo) as has_dog,
        exists (
          select 1 from walk_request r join dog d on d.id = r.dog_id
          where d.owner_id = ${userId} and r.status in ('accepted', 'completed')
        ) as dog_met
    `).then((r) => r.rows),
    // An owner's dog online while no request waits for an answer: the next step is to tell the neighbours.
    p.hasDogs
      ? db.execute<{ id: string; name: string }>(sql`
          select d.id, d.name from dog d
          where d.owner_id = ${userId} and d.status = 'active' and not d.is_demo
            and not exists (
              select 1 from walk_request r join dog o on o.id = r.dog_id where o.owner_id = ${userId} and r.status = 'pending'
            )
          order by d.created_at
          limit 1
        `).then((r) => r.rows)
      : [],
  ])
  const events: PointEvent[] = rows.map((r) => ({ ...r, meta: (r.meta ?? {}) as PointEvent['meta'] }))

  const roles = rolesOf(p)
  const stats = statsFrom(events)
  const badges = badgesFor(stats, roles)
  const points = events.reduce((sum, e) => sum + e.points, 0)
  const level = levelFor(points)

  // Store newly earned badge tiers once, so we know when they were reached and can celebrate them.
  const have = new Set(awards.map((a) => `${a.key}:${a.tier}`))
  const missing = earnedTiers(badges).filter((t) => !have.has(`${t.key}:${t.tier}`))
  if (missing.length) {
    await db
      .insert(s.award)
      .values(missing.map((m) => ({ userId, key: m.key, tier: m.tier, earnedAt: now })))
      .onConflictDoNothing()
  }
  const allAwards = [...awards, ...missing.map((m) => ({ ...m, userId, earnedAt: now, seenAt: null }))]

  const recentEvents = events.slice(0, 8)
  const dogIds = [...new Set(recentEvents.map((e) => e.meta.dogId).filter((id): id is string => Boolean(id)))]
  const dogs = dogIds.length ? await db.select({ id: s.dog.id, name: s.dog.name }).from(s.dog).where(inArray(s.dog.id, dogIds)) : []
  const dogName = new Map(dogs.map((d) => [d.id, d.name]))

  const byWalk: Record<string, number> = {}
  for (const e of events) {
    if (e.ref && ['walk', 'walk-care', 'walk-photo', 'feedback', 'dog-walked'].includes(e.kind)) byWalk[e.ref] = (byWalk[e.ref] ?? 0) + e.points
  }

  return {
    points,
    level,
    levelUp: level.level > p.seenLevel,
    roles,
    weeklyGoal: p.weeklyGoal ?? null,
    walksThisWeek: walksInWeek(events, now),
    weekDays: weekDays(events, now),
    activeWeeks: activeWeeks(events),
    badges,
    earnedAt: Object.fromEntries(allAwards.map((a) => [`${a.key}:${a.tier}`, a.earnedAt])),
    newAwards: allAwards
      .filter((a) => !a.seenAt)
      .map((a) => ({ key: a.key, tier: a.tier }))
      .sort((a, b) => a.key.localeCompare(b.key) || a.tier - b.tier),
    recent: recentEvents.map((e) => ({ kind: e.kind, points: e.points, at: e.at, dogName: e.meta.dogId ? (dogName.get(e.meta.dogId) ?? null) : null })),
    steps: firstSteps(
      {
        about: events.some((e) => e.kind === 'profile'),
        quiz: Boolean(p.quizPassedAt),
        requested: Boolean(facts?.requested),
        walks: stats.walks,
        hasDog: Boolean(facts?.has_dog),
        dogMet: Boolean(facts?.dog_met),
        dogWalks: stats.dogWalks,
        shareDog: shareDog ? { id: shareDog.id, name: shareDog.name } : null,
      },
      roles,
    ),
    byWalk,
  }
}

/** After the celebration: remember the level and badges someone has now seen. */
export async function markProgressSeen(userId: string, level: number): Promise<void> {
  const db = await getDb()
  // Bookkeeping, not something the person changed: updated_at stays as it was, since the seintjes
  // count a changed profile as having done something (server/nudges.ts, lastActive).
  await db
    .update(s.profile)
    .set({ seenLevel: sql`greatest(${s.profile.seenLevel}, ${Math.max(1, Math.trunc(level))})`, updatedAt: sql`${s.profile.updatedAt}` })
    .where(eq(s.profile.userId, userId))
  await db
    .update(s.award)
    .set({ seenAt: new Date() })
    .where(and(eq(s.award.userId, userId), isNull(s.award.seenAt)))
}

export interface DogFriend {
  dog: { id: string; name: string; photos: string[]; avatar: unknown; status: string }
  walks: number
  lastAt: Date | null
}

/** The walker's dog friends: every dog they finished a walk with, closest friends first. */
export async function dogFriendsFor(userId: string): Promise<DogFriend[]> {
  const db = await getDb()
  const rows = await db
    .select({
      id: s.dog.id,
      name: s.dog.name,
      photos: s.dog.photos,
      avatar: s.dog.avatar,
      status: s.dog.status,
      walks: sql<number>`count(*)`.mapWith(Number),
      lastAt: sql<Date | null>`max(${s.walk.startedAt})`.mapWith((v) => (v ? new Date(v) : null)),
    })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .where(and(eq(s.walk.walkerId, userId), eq(s.walk.status, 'ended')))
    .groupBy(s.dog.id)
    .orderBy(desc(sql`count(*)`), desc(sql`max(${s.walk.startedAt})`))
  return rows.map(({ walks, lastAt, ...dog }) => ({ dog, walks, lastAt }))
}
