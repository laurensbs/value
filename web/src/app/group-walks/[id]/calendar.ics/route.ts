import { and, eq, inArray } from 'drizzle-orm'
import { getTranslations } from 'next-intl/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { calendarFile, calendarResponse } from '@/lib/ics'
import { APP_NAME, siteUrl } from '@/lib/site'
import { isOrgMember, requireOnboarded } from '@/server/session'

/**
 * A group walk as a calendar file, with the shelter's ID note and a reminder an hour before. Only
 * for the people who signed up and the shelter's staff.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded('/group-walks')
  const db = await getDb()
  const [row] = await db
    .select({ walk: s.groupWalk, org: s.organization })
    .from(s.groupWalk)
    .innerJoin(s.organization, eq(s.organization.id, s.groupWalk.orgId))
    .where(eq(s.groupWalk.id, id))
  if (!row || row.walk.status !== 'scheduled') return new Response(null, { status: 404 })
  const [signup] = await db
    .select({ status: s.groupWalkSignup.status })
    .from(s.groupWalkSignup)
    .where(
      and(
        eq(s.groupWalkSignup.groupWalkId, id),
        eq(s.groupWalkSignup.userId, viewer.userId),
        inArray(s.groupWalkSignup.status, ['booked', 'attended']),
      ),
    )
  if (!signup && !isOrgMember(viewer, row.org.id)) return new Response(null, { status: 404 })

  const t = await getTranslations()
  const link = `${siteUrl()}/group-walks`
  const file = calendarFile(
    {
      uid: `group-${row.walk.id}@rondje`,
      start: row.walk.startsAt,
      minutes: row.walk.durationMin,
      title: t('calendar.group', { org: row.org.name }),
      location: [row.walk.meetingPoint, row.org.city].filter(Boolean).join(', '),
      description: [row.walk.notes || null, t('groupWalks.idNote'), t('calendar.open', { link })].filter(Boolean).join('\n'),
      url: link,
      alarmMinutes: 60,
    },
    APP_NAME,
  )
  return calendarResponse(file)
}
