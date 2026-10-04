import { and, eq, inArray, isNull, lt, notExists, notInArray, or, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { CHAT_RETENTION_DAYS } from '@/lib/rules'
import { TIP_RETENTION_DAYS } from '@/lib/tips'
import { OPEN_REPORT, purgeOldWalks } from '@/server/blob-cleanup'
import { claimRun } from '@/server/cron'

/** Private feedback after a walk is kept for a year (privacy statement, section 10). */
const FEEDBACK_RETENTION_DAYS = 365
const OPEN_TIPS = ['new', 'contacted']
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60_000)

/**
 * Daily housekeeping (Vercel Cron): delete walk routes, end positions and walk photos (also from
 * Vercel Blob) after 30 days unless an open report needs them, expire old pending requests, close
 * walks left running, and delete old shelter tips, chat messages and private feedback.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // Without the secret anyone can call this; live, it then runs once a day, for whoever calls first.
  if (!secret && process.env.VERCEL_ENV === 'production' && !(await claimRun('cleanup'))) {
    return NextResponse.json({ skipped: 'ran-today' })
  }
  const db = await getDb()

  const walks = await purgeOldWalks()

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

  // Shelter tips: handled ones go a year after they were handled, ones nobody acted on after two years.
  const tips = await db
    .delete(s.suggestion)
    .where(
      or(
        and(notInArray(s.suggestion.status, OPEN_TIPS), lt(s.suggestion.handledAt, daysAgo(TIP_RETENTION_DAYS))),
        and(
          or(inArray(s.suggestion.status, OPEN_TIPS), isNull(s.suggestion.handledAt)),
          lt(s.suggestion.createdAt, daysAgo(2 * TIP_RETENTION_DAYS)),
        ),
      ),
    )
    .returning({ id: s.suggestion.id })

  const chats = await db
    .delete(s.chatMessage)
    .where(lt(s.chatMessage.createdAt, daysAgo(CHAT_RETENTION_DAYS)))
    .returning({ id: s.chatMessage.id })

  // Like the route: an open report about the walk keeps its feedback until it is handled.
  const feedback = await db
    .delete(s.feedback)
    .where(
      and(
        lt(s.feedback.createdAt, daysAgo(FEEDBACK_RETENTION_DAYS)),
        notExists(
          db
            .select({ one: sql`1` })
            .from(s.report)
            .where(and(eq(s.report.walkId, s.feedback.walkId), inArray(s.report.status, OPEN_REPORT))),
        ),
      ),
    )
    .returning({ id: s.feedback.id })

  return NextResponse.json({
    routesDeletedForWalks: walks.walks,
    walkPointsDeleted: walks.points,
    walkPhotosDeleted: walks.photos,
    blobFilesDeleted: walks.files,
    walkPhotosKept: walks.photosKept,
    requestsExpired: expired.length,
    walksClosed: stale.length,
    tipsDeleted: tips.length,
    chatMessagesDeleted: chats.length,
    feedbackDeleted: feedback.length,
  })
}
