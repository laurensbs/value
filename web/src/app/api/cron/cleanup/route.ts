import { and, eq, inArray, isNull, lt, notInArray, or, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { ROUTE_RETENTION_DAYS } from '@/lib/rules'
import { TIP_RETENTION_DAYS } from '@/lib/tips'

/**
 * Daily housekeeping (Vercel Cron): delete walk routes after 30 days unless an open
 * report needs them, expire old pending requests, close walks left running, and
 * delete old shelter tips.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const db = await getDb()
  const cutoff = new Date(Date.now() - ROUTE_RETENTION_DAYS * 24 * 60 * 60_000)

  const openReportWalks = await db
    .select({ id: s.report.walkId })
    .from(s.report)
    .where(and(inArray(s.report.status, ['open', 'reviewing']), sql`${s.report.walkId} is not null`))
  const keep = openReportWalks.map((r) => r.id!).filter(Boolean)
  const oldWalks = await db
    .select({ id: s.walk.id })
    .from(s.walk)
    .where(keep.length ? and(lt(s.walk.startedAt, cutoff), notInArray(s.walk.id, keep)) : lt(s.walk.startedAt, cutoff))
  if (oldWalks.length) await db.delete(s.walkPoint).where(inArray(s.walkPoint.walkId, oldWalks.map((w) => w.id)))

  const expired = await db
    .update(s.walkRequest)
    .set({ status: 'expired' })
    .where(and(eq(s.walkRequest.status, 'pending'), lt(s.walkRequest.startsAt, new Date())))
    .returning({ id: s.walkRequest.id })

  const stale = await db
    .update(s.walk)
    .set({ status: 'ended', endedAt: new Date() })
    .where(and(eq(s.walk.status, 'active'), lt(s.walk.startedAt, new Date(Date.now() - 12 * 60 * 60_000)), isNull(s.walk.endedAt)))
    .returning({ id: s.walk.id })

  // Shelter tips: handled ones go after a year, ones nobody acted on after two years.
  const tips = await db
    .delete(s.suggestion)
    .where(
      or(
        and(notInArray(s.suggestion.status, ['new', 'contacted']), lt(s.suggestion.handledAt, new Date(Date.now() - TIP_RETENTION_DAYS * 24 * 60 * 60_000))),
        lt(s.suggestion.createdAt, new Date(Date.now() - 2 * TIP_RETENTION_DAYS * 24 * 60 * 60_000)),
      ),
    )
    .returning({ id: s.suggestion.id })

  return NextResponse.json({ routesDeletedForWalks: oldWalks.length, requestsExpired: expired.length, walksClosed: stale.length, tipsDeleted: tips.length })
}
