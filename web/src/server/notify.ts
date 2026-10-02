import 'server-only'
import { eq, inArray, sql } from 'drizzle-orm'
import type { Db } from '@/db'
import * as s from '@/db/schema'
import { adminEmails } from '@/lib/site'
import { EMAIL_KINDS } from '@/lib/notification-links'
import { emailEnabled, notificationEmail, sendEmailLater, toLocale } from './email'

export type NotificationKind =
  | 'request-new'
  | 'request-accepted'
  | 'request-declined'
  | 'request-cancelled'
  | 'walk-started'
  | 'walk-ended'
  | 'walk-photo'
  | 'walk-overdue'
  | 'trust-granted'
  | 'group-signup'
  | 'org-verified'
  | 'org-pending'
  | 'shelter-joined'
  | 'group-walk-new'
  | 'chat-message'

export async function notify(
  db: Db,
  userIds: (string | null | undefined)[],
  kind: NotificationKind,
  data: Record<string, string | number | null>,
): Promise<void> {
  const unique = [...new Set(userIds.filter((u): u is string => Boolean(u)))]
  if (unique.length === 0) return
  await db.insert(s.notification).values(
    unique.map((userId) => ({ id: crypto.randomUUID(), userId, kind, data })),
  )
  if (emailEnabled() && (EMAIL_KINDS as readonly string[]).includes(kind)) await emailNotification(db, unique, kind, data)
}

/** The same notification by email, in each person's language, unless they turned it off. */
async function emailNotification(db: Db, userIds: string[], kind: NotificationKind, data: Record<string, string | number | null>) {
  const people = await db
    .select({ email: s.user.email, locale: s.profile.locale, wantsEmail: s.profile.emailNotifications, bannedAt: s.profile.bannedAt })
    .from(s.user)
    .leftJoin(s.profile, eq(s.profile.userId, s.user.id))
    .where(inArray(s.user.id, userIds))
  const text = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v == null ? undefined : String(v)]))
  for (const person of people) {
    if (person.wantsEmail === false || person.bannedAt) continue
    const email = await notificationEmail(kind, text, toLocale(person.locale), person.email)
    if (email) sendEmailLater(email)
  }
}

/** Rondje's own admins (ADMIN_EMAILS), for things only they can act on, like checking a new shelter. */
export async function notifyAdmins(db: Db, kind: NotificationKind, data: Record<string, string | number | null>): Promise<void> {
  const emails = adminEmails()
  if (emails.length === 0) return
  const admins = await db.select({ id: s.user.id }).from(s.user).where(inArray(sql`lower(${s.user.email})`, emails))
  await notify(db, admins.map((a) => a.id), kind, data)
}

export async function audit(
  db: Db,
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await db.insert(s.auditLog).values({ id: crypto.randomUUID(), actorId, action, targetType, targetId, data })
}
