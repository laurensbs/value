import { getTranslations } from 'next-intl/server'
import { calendarFile, calendarResponse } from '@/lib/ics'
import { isInPerson } from '@/lib/rules'
import { APP_NAME, siteUrl } from '@/lib/site'
import { chatAccess, partnerOf } from '@/server/chat'
import { requireOnboarded } from '@/server/session'

/**
 * An accepted meeting or walk as a calendar file, with a reminder an hour before. Only for the
 * people in it: the walker, the owner and the shelter's staff.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await requireOnboarded('/requests')
  const access = await chatAccess(id, viewer)
  if (!access || access.request.status !== 'accepted') return new Response(null, { status: 404 })
  const { dog, request } = access
  const t = await getTranslations('calendar')
  const partner = await partnerOf(access)
  const link = `${siteUrl()}/requests`

  const file = calendarFile(
    {
      uid: `${request.id}@rondje`,
      start: request.startsAt,
      minutes: request.durationMin,
      title: request.kind === 'meet' ? t('meet', { dog: dog.name, via: request.meetVia }) : t('walk', { dog: dog.name }),
      // A first call has no place to meet.
      location: isInPerson(request.meetVia) ? dog.meetingInfo || dog.city || undefined : undefined,
      description: [partner.name ? t('with', { name: partner.name }) : null, t('open', { link })].filter(Boolean).join('\n'),
      url: link,
      weekly: request.weekly,
      alarmMinutes: 60,
    },
    APP_NAME,
  )
  return calendarResponse(file)
}
