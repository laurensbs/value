import 'server-only'
import { desc, eq, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import type { ContactJson } from '@/components/launch/audiences'
import { enabledSocialProviders } from '@/lib/auth'
import { adminEmails } from '@/lib/site'
import { growthKpis } from './kpis'
import {
  countPerWeek,
  detectMilestones,
  groupTasks,
  levelFor,
  MILESTONE_PREFIX,
  monthlyCosts,
  newlyReached,
  pointsFor,
  ratio,
  realRows,
  routeToFirstWalk,
  taskStates,
  walksPerActiveWalker,
  weekStarts,
  type AutoCheck,
  type DataRow,
  type LaunchFacts,
} from './launch-core'

/** Example rows from the seed (src/db/seed.ts) have ids and e-mail addresses like these. */
export const isDemoId = (id: string | null | undefined) => Boolean(id?.startsWith('demo-'))
const isDemoEmail = (email: string) => email.toLowerCase().endsWith('@demo.example.org')

/**
 * Everything the launch hub shows, from real data only. Only counts and dates leave this
 * function, except the outreach contacts (the admin's own list). Example data (is_demo, ids
 * starting with "demo-") and the admins themselves never count.
 */
export async function launchData(now = new Date()) {
  const db = await getDb()

  const [stored, shelterRows, introRows, walkRows, memberRows, dogRows, orgRows, contactRows, kpi] = await Promise.all([
    db.select().from(s.launchTask),
    db
      .select({
        id: s.organization.id,
        isDemo: s.organization.isDemo,
        createdAt: s.organization.createdAt,
        // When an admin verified it (audit log), so "first shelter online" gets the right date.
        verifiedAt: sql<Date | null>`(select min(${s.auditLog.createdAt}) from ${s.auditLog} where ${s.auditLog.action} = 'org.verified' and ${s.auditLog.targetId} = ${s.organization.id})`.mapWith(
          s.auditLog.createdAt,
        ),
      })
      .from(s.organization)
      .where(eq(s.organization.status, 'verified')),
    db
      .select({ walkerId: s.walkRequest.walkerId, dogId: s.dog.id, dogIsDemo: s.dog.isDemo, ownerId: s.dog.ownerId, at: s.walkRequest.createdAt })
      .from(s.walkRequest)
      .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId))
      .where(eq(s.walkRequest.kind, 'meet')),
    db
      .select({ walkerId: s.walk.walkerId, dogId: s.dog.id, dogIsDemo: s.dog.isDemo, ownerId: s.dog.ownerId, at: s.walk.endedAt })
      .from(s.walk)
      .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
      .where(eq(s.walk.status, 'ended')),
    db
      .select({ userId: s.profile.userId, at: s.profile.createdAt, email: s.user.email, role: s.user.role })
      .from(s.profile)
      .innerJoin(s.user, eq(s.user.id, s.profile.userId)),
    db.select({ id: s.dog.id, isDemo: s.dog.isDemo, ownerId: s.dog.ownerId, at: s.dog.createdAt }).from(s.dog).where(ne(s.dog.status, 'draft')),
    db.select({ id: s.organization.id, isDemo: s.organization.isDemo, at: s.organization.createdAt }).from(s.organization).where(ne(s.organization.status, 'rejected')),
    db.select().from(s.outreachContact).orderBy(desc(s.outreachContact.createdAt)),
    growthKpis(now),
  ])

  const admins = new Set(adminEmails())
  const facts: LaunchFacts = {
    shelters: shelterRows.map((o) => ({ at: o.verifiedAt ?? o.createdAt, demo: o.isDemo || isDemoId(o.id) })),
    intros: introRows.map((r) => ({ at: r.at, demo: r.dogIsDemo || isDemoId(r.dogId) || isDemoId(r.walkerId) || isDemoId(r.ownerId) })),
    walks: walkRows
      .filter((w) => w.at)
      .map((w) => ({ at: w.at!, walkerId: w.walkerId, demo: w.dogIsDemo || isDemoId(w.dogId) || isDemoId(w.walkerId) || isDemoId(w.ownerId) })),
    members: memberRows.map((m) => ({
      at: m.at,
      demo: isDemoId(m.userId) || isDemoEmail(m.email),
      admin: m.role === 'admin' || admins.has(m.email.toLowerCase()),
    })),
  }
  const dogs: DataRow[] = dogRows.map((d) => ({ at: d.at, demo: d.isDemo || isDemoId(d.id) || isDemoId(d.ownerId) }))
  const orgs: DataRow[] = orgRows.map((o) => ({ at: o.at, demo: o.isDemo || isDemoId(o.id) }))

  // Milestones: a milestone reached for the first time is stored, so its badge stays.
  const storedMilestones = new Map(stored.filter((t) => t.key.startsWith(MILESTONE_PREFIX)).map((t) => [t.key, t.doneAt]))
  const milestones = detectMilestones(facts, storedMilestones)
  const fresh = newlyReached(milestones, storedMilestones)
  if (fresh.length) {
    await db
      .insert(s.launchTask)
      .values(fresh.map((m) => ({ key: MILESTONE_PREFIX + m.id, status: 'done', doneAt: m.at ?? now })))
      .onConflictDoNothing()
  }

  const contacts: ContactJson[] = contactRows.map((c) => ({
    id: c.id,
    audience: c.audience as ContactJson['audience'],
    name: c.name,
    organisation: c.organisation,
    email: c.email,
    phone: c.phone,
    city: c.city,
    status: c.status as ContactJson['status'],
    lastContactAt: c.lastContactAt?.toISOString() ?? null,
    note: c.note,
    createdAt: c.createdAt.toISOString(),
  }))

  const auto: Record<AutoCheck, boolean> = {
    // This hub only exists once the parity work is merged; seeing it in production means it is live.
    production: process.env.VERCEL_ENV === 'production',
    socialLogin: enabledSocialProviders.includes('google') && enabledSocialProviders.includes('apple'),
    shelterMails: contacts.filter((c) => c.audience === 'shelter' && c.status !== 'todo').length >= 10,
    shelterMeeting: contacts.some((c) => c.audience === 'shelter' && c.status === 'meeting'),
    realDog: kpi.dogsOnline > 0,
  }
  const tasks = taskStates(
    stored.filter((t) => !t.key.startsWith(MILESTONE_PREFIX)),
    auto,
  )
  const points = pointsFor(tasks, milestones)

  const starts = weekStarts(now)
  const members = realRows(facts.members)
  const costs = monthlyCosts(new Set(tasks.filter((t) => t.done).map((t) => t.key)))

  return {
    tasks: groupTasks(tasks),
    points,
    level: levelFor(points),
    milestones,
    route: routeToFirstWalk(tasks, milestones),
    members: members.length,
    weeks: {
      starts,
      series: {
        members: countPerWeek(members, starts),
        dogs: countPerWeek(realRows(dogs), starts),
        shelters: countPerWeek(realRows(orgs), starts),
        intros: countPerWeek(realRows(facts.intros), starts),
        walks: countPerWeek(realRows(facts.walks), starts),
      },
    },
    kpi,
    costs: {
      ...costs,
      perMember: ratio(costs.total, members.length),
      walksPerActive: walksPerActiveWalker(facts.walks, now),
    },
    contacts,
  }
}

export type LaunchData = Awaited<ReturnType<typeof launchData>>
