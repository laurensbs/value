import 'server-only'
import type { Db } from '@/db'
import * as s from '@/db/schema'

export type NotificationKind =
  | 'request-new'
  | 'request-accepted'
  | 'request-declined'
  | 'request-cancelled'
  | 'walk-started'
  | 'walk-ended'
  | 'walk-overdue'
  | 'trust-granted'
  | 'group-signup'
  | 'org-verified'

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
