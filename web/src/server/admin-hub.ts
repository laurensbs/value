import 'server-only'
import { and, arrayOverlaps, count, countDistinct, eq, gte, inArray, isNull, lt, not, or, sql } from 'drizzle-orm'
import { dbMode, getDb } from '@/db'
import * as s from '@/db/schema'
import { enabledSocialProviders } from '@/lib/auth'
import { CHAT_WARN_FLAGS } from '@/lib/rules'
import { tipKey } from '@/lib/tips'
import { groupTips, opsQuestions, opsSummary, type OpsFacts } from './admin-questions'
import { MILESTONE_PREFIX, taskStates } from './launch-core'

const HOUR = 60 * 60_000
const DAY = 24 * HOUR

/** How tips are grouped everywhere in Beheer: per directory shelter, or per country and normalised name. */
export const tipGroupKey = (tip: { directoryId: string | null; country: string; name: string }) => tip.directoryId ?? `${tip.country}:${tipKey(tip.name)}`

/**
 * Everything the admin home (/admin) shows: the live counts on the tiles and the answers to
 * "de beste vragen". Only counts, dates, first names and dog or shelter names leave this function.
 */
export async function adminHub(now = new Date()) {
  const db = await getDb()
  const ago = (ms: number) => new Date(now.getTime() - ms)
  const weekAgo = ago(7 * DAY)
  const realDog = eq(s.dog.isDemo, false)

  // How long one simple question takes: the first sign of a cold or far-away database.
  const started = performance.now()
  await db.execute(sql`select 1`)
  const dbMs = performance.now() - started

  const [
    activeWalks,
    openReports,
    [[flaggedFeedback], [flaggedRequests], [flaggedChats]],
    pendingIntros,
    metWithoutId,
    pendingShelters,
    bannedThisWeek,
    [blocksThisWeek],
    repeatBlocked,
    upcomingGroupWalks,
    openTips,
    [[lateRequests], [lateWalks], [lateRoutes]],
    launchRows,
    contacts,
    [[dogsOnline], [walksWeek]],
  ] = await Promise.all([
    db
      .select({ walkId: s.walk.id, dogName: s.dog.name, plannedEndAt: s.walk.plannedEndAt })
      .from(s.walk)
      .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
      .where(eq(s.walk.status, 'active')),
    db.select({ category: s.report.category, createdAt: s.report.createdAt }).from(s.report).where(eq(s.report.status, 'open')),
    Promise.all([
      db.select({ n: count() }).from(s.feedback).where(and(eq(s.feedback.flagged, true), gte(s.feedback.createdAt, weekAgo))),
      db.select({ n: count() }).from(s.walkRequest).where(and(sql`cardinality(${s.walkRequest.flags}) > 0`, gte(s.walkRequest.createdAt, weekAgo))),
      db.select({ n: count() }).from(s.chatMessage).where(and(arrayOverlaps(s.chatMessage.flags, [...CHAT_WARN_FLAGS]), gte(s.chatMessage.createdAt, weekAgo))),
    ]),
    // Meeting requests still waiting for the owner (only real dogs).
    db
      .select({
        requestId: s.walkRequest.id,
        dogId: s.dog.id,
        dogName: s.dog.name,
        walkerName: s.profile.firstName,
        createdAt: s.walkRequest.createdAt,
        startsAt: s.walkRequest.startsAt,
      })
      .from(s.walkRequest)
      .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId))
      .innerJoin(s.profile, eq(s.profile.userId, s.walkRequest.walkerId))
      .where(and(eq(s.walkRequest.kind, 'meet'), eq(s.walkRequest.status, 'pending'), realDog))
      .limit(200),
    // Meetings that happened (more than a day ago, in the last 30 days) without "ID gezien" from the owner.
    db
      .select({ requestId: s.walkRequest.id, dogId: s.dog.id, dogName: s.dog.name, walkerName: s.profile.firstName, startsAt: s.walkRequest.startsAt })
      .from(s.walkRequest)
      .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId))
      .innerJoin(s.profile, eq(s.profile.userId, s.walkRequest.walkerId))
      .leftJoin(s.trustGrant, and(eq(s.trustGrant.dogId, s.walkRequest.dogId), eq(s.trustGrant.walkerId, s.walkRequest.walkerId)))
      .where(
        and(
          eq(s.walkRequest.kind, 'meet'),
          eq(s.walkRequest.status, 'accepted'),
          lt(s.walkRequest.startsAt, ago(DAY)),
          gte(s.walkRequest.startsAt, ago(30 * DAY)),
          realDog,
          or(isNull(s.trustGrant.idSeen), eq(s.trustGrant.idSeen, false)),
        ),
      )
      .limit(200),
    db
      .select({ createdAt: s.organization.createdAt })
      .from(s.organization)
      .where(and(eq(s.organization.status, 'pending'), eq(s.organization.isDemo, false))),
    db
      .select({ name: s.profile.firstName })
      .from(s.profile)
      .where(gte(s.profile.bannedAt, weekAgo))
      .limit(20),
    db.select({ n: count() }).from(s.block).where(gte(s.block.createdAt, weekAgo)),
    db
      .select({ blockedId: s.block.blockedId })
      .from(s.block)
      .where(gte(s.block.createdAt, ago(30 * DAY)))
      .groupBy(s.block.blockedId)
      .having(gte(count(), 2)),
    db
      .select({
        orgId: s.organization.id,
        orgName: s.organization.name,
        startsAt: s.groupWalk.startsAt,
        booked: sql<number>`(select count(*) from ${s.groupWalkSignup} where ${s.groupWalkSignup.groupWalkId} = ${s.groupWalk.id} and ${s.groupWalkSignup.status} in ('booked','attended'))`.mapWith(Number),
      })
      .from(s.groupWalk)
      .innerJoin(s.organization, eq(s.organization.id, s.groupWalk.orgId))
      .where(
        and(
          eq(s.groupWalk.status, 'scheduled'),
          gte(s.groupWalk.startsAt, now),
          lt(s.groupWalk.startsAt, new Date(now.getTime() + 2 * DAY)),
          eq(s.organization.isDemo, false),
        ),
      ),
    db
      .select({
        id: s.suggestion.id,
        name: s.suggestion.name,
        country: s.suggestion.country,
        directoryId: s.suggestion.directoryId,
        status: s.suggestion.status,
        handledAt: s.suggestion.handledAt,
        note: s.suggestion.note,
      })
      .from(s.suggestion)
      .where(inArray(s.suggestion.status, ['new', 'contacted']))
      .limit(1000),
    // What the daily cleanup (03:15 UTC) should have done by now; a backlog means it is not running.
    Promise.all([
      db.select({ n: count() }).from(s.walkRequest).where(and(eq(s.walkRequest.status, 'pending'), lt(s.walkRequest.startsAt, ago(26 * HOUR)))),
      db.select({ n: count() }).from(s.walk).where(and(eq(s.walk.status, 'active'), lt(s.walk.startedAt, ago(36 * HOUR)))),
      db
        .select({ n: countDistinct(s.walkPoint.walkId) })
        .from(s.walkPoint)
        .innerJoin(s.walk, eq(s.walk.id, s.walkPoint.walkId))
        .where(
          and(
            lt(s.walk.startedAt, ago(31 * DAY)),
            // Routes that an open report still needs are kept on purpose.
            not(
              sql`exists (select 1 from ${s.report} where ${s.report.walkId} = ${s.walk.id} and ${s.report.status} in ('open','reviewing'))`,
            ),
          ),
        ),
    ]),
    db.select().from(s.launchTask),
    db.select({ audience: s.outreachContact.audience, status: s.outreachContact.status }).from(s.outreachContact),
    Promise.all([
      db.select({ n: count() }).from(s.dog).where(and(eq(s.dog.status, 'active'), realDog)),
      db.select({ n: count() }).from(s.walk).where(and(eq(s.walk.status, 'ended'), gte(s.walk.endedAt, weekAgo))),
    ]),
  ])

  const tipGroups = groupTips(openTips, tipGroupKey)
  const facts: OpsFacts = {
    now,
    activeWalks,
    openReports,
    signals: { feedback: flaggedFeedback.n, requests: flaggedRequests.n, chats: flaggedChats.n },
    pendingIntros,
    metWithoutId,
    pendingShelters,
    bannedThisWeek,
    blocksThisWeek: blocksThisWeek.n,
    repeatBlocked: repeatBlocked.length,
    upcomingGroupWalks,
    tipGroups: tipGroups.map((g) => ({ name: g.first.name, votes: g.ids.length, status: g.contacted ? 'contacted' : 'new', handledAt: g.handledAt })),
    system: {
      database: dbMode(),
      dbMs,
      hosted: Boolean(process.env.VERCEL),
      backlog: { requests: lateRequests.n, walks: lateWalks.n, routes: lateRoutes.n },
    },
  }
  const questions = opsQuestions(facts)

  // The launch hub's "Wacht op Laurens" tasks, with the same automatic checks as the hub itself.
  const shelterContacts = contacts.filter((c) => c.audience === 'shelter')
  const tasks = taskStates(
    launchRows.filter((r) => !r.key.startsWith(MILESTONE_PREFIX)),
    {
      production: process.env.VERCEL_ENV === 'production',
      socialLogin: enabledSocialProviders.includes('google') && enabledSocialProviders.includes('apple'),
      shelterMails: shelterContacts.filter((c) => c.status !== 'todo').length >= 10,
      shelterMeeting: shelterContacts.some((c) => c.status === 'meeting'),
      realDog: dogsOnline.n > 0,
    },
  )
  const waiting = tasks.filter((t) => t.waiting)

  return {
    questions,
    summary: opsSummary(questions),
    tiles: {
      launch: { open: waiting.filter((t) => !t.done).length, total: waiting.length },
      moderation: { reports: openReports.length, signals: facts.signals.feedback + facts.signals.requests + facts.signals.chats },
      shelters: { pending: pendingShelters.length },
      tips: { open: tipGroups.filter((g) => !g.contacted).length },
      numbers: { walksWeek: walksWeek.n, running: activeWalks.length },
    },
  }
}

export type AdminHub = Awaited<ReturnType<typeof adminHub>>
