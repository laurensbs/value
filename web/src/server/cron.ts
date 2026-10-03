import 'server-only'
import { and, asc, eq, gt } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'

/**
 * Without CRON_SECRET anyone can call a daily job. Then it runs at most once in `hours`: every
 * call writes a line (with the database's clock) and only the earliest line of that window does
 * the work, so a burst of calls cannot send anyone the same reminder twice.
 */
export async function claimRun(job: string, hours = 20): Promise<boolean> {
  const db = await getDb()
  const id = crypto.randomUUID()
  const action = `cron.${job}`
  await db.insert(s.auditLog).values({ id, actorId: null, action, targetType: 'cron', targetId: job })
  const [first] = await db
    .select({ id: s.auditLog.id })
    .from(s.auditLog)
    .where(and(eq(s.auditLog.action, action), gt(s.auditLog.createdAt, new Date(Date.now() - hours * 60 * 60_000))))
    .orderBy(asc(s.auditLog.createdAt), asc(s.auditLog.id))
    .limit(1)
  return first?.id === id
}
