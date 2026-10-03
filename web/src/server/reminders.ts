import 'server-only'
import { and, eq, gt, gte, inArray, lt, sql } from 'drizzle-orm'
import { getDb, type Db } from '@/db'
import * as s from '@/db/schema'
import { reminderMoment, reminderWindow } from '@/lib/appointments'
import { REMINDER_KINDS, type NotificationData, type ReminderKind } from '@/lib/notification-links'
import { localParts } from '@/lib/progress'
import { emailEnabled, notificationEmail, sendEmail, toLocale } from './email'
import { canPush, pushNow } from './push'
import { watchers } from './walks'

// A heads-up about today's and tomorrow's appointments, from the morning run of the daily job:
// "Morgen om 10:00: kennismaken met Bello." An accepted walk or first meeting is for the walker
// and for the owner or the shelter's staff; a group walk for everyone who signed up. Each person
// hears it once per appointment (a weekly walk once a week, a moved one again with the new time):
// as a push when one of their devices can get it, otherwise by email when they allow email. It is
// also in their notification list. It is about their own appointment, so unlike the friendly
// reminders it does not depend on that setting.

const DAY = 24 * 60 * 60_000
const AT_ONCE = 10

interface Reminder {
  userId: string
  kind: ReminderKind
  /** The request or group walk it is about. */
  ref: string
  data: NotificationData & { at: string }
}

export interface ReminderRun {
  /** Requests and group walks someone was reminded of. */
  appointments: number
  groupWalks: number
  pushed: number
  emailed: number
  /** Who got one: their friendly reminder can wait a day. */
  people: string[]
}

/** One run. Only during the day in the Netherlands, whoever starts it. */
export async function sendAppointmentReminders(now = new Date()): Promise<ReminderRun> {
  const run: ReminderRun = { appointments: 0, groupWalks: 0, pushed: 0, emailed: 0, people: [] }
  const hour = localParts(now).hour
  if (hour < 8 || hour >= 21) return run

  const db = await getDb()
  const { from, to } = reminderWindow(now)
  const all = [...(await requestReminders(db, from, to, now)), ...(await groupWalkReminders(db, from, to, now))]
  if (!all.length) return run

  const ids = [...new Set(all.map((r) => r.userId))]
  const [sent, people, devices] = await Promise.all([
    db
      .select({
        userId: s.notification.userId,
        kind: s.notification.kind,
        ref: sql<string>`coalesce(${s.notification.data}->>'requestId', ${s.notification.data}->>'groupWalkId')`,
        at: sql<string>`${s.notification.data}->>'at'`,
      })
      .from(s.notification)
      .where(
        and(
          inArray(s.notification.userId, ids),
          inArray(s.notification.kind, [...REMINDER_KINDS]),
          gt(s.notification.createdAt, new Date(now.getTime() - 3 * DAY)),
        ),
      ),
    db
      .select({ userId: s.user.id, email: s.user.email, locale: s.profile.locale, wantsEmail: s.profile.emailNotifications, bannedAt: s.profile.bannedAt })
      .from(s.user)
      .leftJoin(s.profile, eq(s.profile.userId, s.user.id))
      .where(inArray(s.user.id, ids)),
    db.select({ userId: s.pushDevice.userId, kind: s.pushDevice.kind }).from(s.pushDevice).where(inArray(s.pushDevice.userId, ids)),
  ])

  const key = (r: { userId: string; kind: string; ref: string; at: string }) => `${r.userId}|${r.kind}|${r.ref}|${r.at}`
  const done = new Set(sent.map(key))
  const personOf = new Map(people.map((p) => [p.userId, p]))
  const pushable = new Set(devices.filter((d) => canPush(d.kind)).map((d) => d.userId))
  const due = all.filter((r) => personOf.has(r.userId) && !personOf.get(r.userId)!.bannedAt && !done.has(key({ ...r, at: r.data.at })))
  if (!due.length) return run

  await db.insert(s.notification).values(due.map((r) => ({ id: crypto.randomUUID(), userId: r.userId, kind: r.kind, data: r.data, createdAt: now })))
  for (let i = 0; i < due.length; i += AT_ONCE) {
    const results = await Promise.all(due.slice(i, i + AT_ONCE).map((r) => deliver(db, r, personOf.get(r.userId)!, pushable.has(r.userId))))
    for (const result of results) {
      if (result === 'push') run.pushed++
      if (result === 'email') run.emailed++
    }
  }
  run.appointments = new Set(due.filter((r) => r.kind === 'request-reminder').map((r) => r.ref)).size
  run.groupWalks = new Set(due.filter((r) => r.kind === 'group-walk-reminder').map((r) => r.ref)).size
  run.people = [...new Set(due.map((r) => r.userId))]
  return run
}

/** Accepted walks and first meetings: the walker, and the owner or the shelter's staff. */
async function requestReminders(db: Db, from: Date, to: Date, now: Date): Promise<Reminder[]> {
  const rows = await db
    .select({ request: s.walkRequest, dog: s.dog })
    .from(s.walkRequest)
    .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId))
    .where(and(eq(s.walkRequest.status, 'accepted'), gte(s.walkRequest.startsAt, from), lt(s.walkRequest.startsAt, to), eq(s.dog.isDemo, false)))
  const reminders: Reminder[] = []
  for (const { request, dog } of rows) {
    const moment = reminderMoment(request.startsAt, now)
    if (!moment) continue
    const data = {
      requestId: request.id,
      dogName: dog.name,
      day: moment.day,
      time: moment.time,
      // A first meeting by phone, video or at home says so; walking together stays "meet".
      variant: request.kind !== 'meet' ? 'walk' : request.meetVia === 'walk' ? 'meet' : request.meetVia,
      at: request.startsAt.toISOString(),
    }
    for (const userId of new Set([request.walkerId, ...(await watchers(dog))])) {
      reminders.push({ userId, kind: 'request-reminder', ref: request.id, data })
    }
  }
  return reminders
}

/** Group walks of verified shelters: everyone who signed up. */
async function groupWalkReminders(db: Db, from: Date, to: Date, now: Date): Promise<Reminder[]> {
  const rows = await db
    .select({ id: s.groupWalk.id, startsAt: s.groupWalk.startsAt, orgId: s.organization.id, orgName: s.organization.name, userId: s.groupWalkSignup.userId })
    .from(s.groupWalkSignup)
    .innerJoin(s.groupWalk, eq(s.groupWalk.id, s.groupWalkSignup.groupWalkId))
    .innerJoin(s.organization, eq(s.organization.id, s.groupWalk.orgId))
    .where(
      and(
        eq(s.groupWalkSignup.status, 'booked'),
        eq(s.groupWalk.status, 'scheduled'),
        gte(s.groupWalk.startsAt, from),
        lt(s.groupWalk.startsAt, to),
        eq(s.organization.status, 'verified'),
        eq(s.organization.isDemo, false),
      ),
    )
  return rows.flatMap((row) => {
    const moment = reminderMoment(row.startsAt, now)
    if (!moment) return []
    const data = { groupWalkId: row.id, orgId: row.orgId, orgName: row.orgName, day: moment.day, time: moment.time, at: row.startsAt.toISOString() }
    return [{ userId: row.userId, kind: 'group-walk-reminder' as const, ref: row.id, data }]
  })
}

type Person = { email: string; locale: string | null; wantsEmail: boolean | null }

async function deliver(db: Db, reminder: Reminder, person: Person, pushable: boolean): Promise<'push' | 'email' | null> {
  try {
    if (pushable) {
      await pushNow(db, [reminder.userId], reminder.kind, reminder.data)
      return 'push'
    }
    if (emailEnabled() && person.wantsEmail !== false) {
      const email = await notificationEmail(reminder.kind, reminder.data, toLocale(person.locale), person.email)
      if (email && (await sendEmail(email))) return 'email'
    }
  } catch (error) {
    console.error('[reminders] could not deliver', error)
  }
  return null
}
