import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { notificationHref, notificationValues, type NotificationData } from '@/lib/notification-links'
import { markNotificationsRead } from '@/server/actions/profile'
import { apiViewer, json } from '@/server/api'
import { notificationsFor } from '@/server/queries'

/** The latest notifications, with the text in the person's language and the page it leads to (a website path). */
export async function GET() {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const rows = await notificationsFor(viewer.userId)
  const t = await getTranslations('notifications')
  return json({
    notifications: rows.map((n) => {
      const data = (n.data ?? {}) as NotificationData
      return {
        id: n.id,
        kind: n.kind,
        data: n.data,
        text: t.has(`kinds.${n.kind}`) ? t(`kinds.${n.kind}`, notificationValues(data)) : '',
        href: notificationHref(n.kind, data),
        read: Boolean(n.readAt),
        createdAt: n.createdAt,
      }
    }),
  })
}

/** Mark everything as read. */
export async function POST() {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  await markNotificationsRead()
  return json({ ok: true })
}
