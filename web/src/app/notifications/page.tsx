import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon, type IconName } from '@/components/Icon'
import { MarkNotificationsRead } from '@/components/MarkNotificationsRead'
import { notificationHref, notificationValues, type NotificationData } from '@/lib/notification-links'
import { notificationsFor } from '@/server/queries'
import { requireViewer } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('notifications')
  return { title: t('title') }
}

const ICONS: Record<string, IconName> = {
  'request-new': 'paw',
  'request-accepted': 'paw',
  'request-reminder': 'calendar',
  'walk-started': 'route',
  'walk-ended': 'route',
  'walk-overdue': 'alert',
  'trust-granted': 'shield',
  'group-signup': 'users',
  'org-verified': 'building',
  'org-pending': 'building',
  'shelter-joined': 'heart',
  'group-walk-new': 'users',
  'group-walk-reminder': 'calendar',
  'chat-message': 'chat',
  'walk-photo': 'camera',
  'nudge-step': 'sparkle',
  'nudge-week': 'calendar',
  'nudge-challenge': 'trophy',
  'challenge-done': 'trophy',
  'nudge-new-dog': 'paw',
  'nudge-back': 'paw',
  'nudge-owner': 'home',
}

export default async function NotificationsPage() {
  const viewer = await requireViewer('/notifications')
  const items = await notificationsFor(viewer.userId)
  const t = await getTranslations('notifications')
  const format = await getFormatter()
  const hasUnread = items.some((n) => !n.readAt)

  return (
    <div className="narrow-page stack-l">
      <h1>{t('title')}</h1>
      {items.length === 0 ? (
        <p className="muted">{t('empty')}</p>
      ) : (
        <ul className="list">
          {items.map((n) => {
            const data = (n.data ?? {}) as NotificationData
            return (
              <li key={n.id}>
                <Link href={notificationHref(n.kind, data)} className={`list-item notification${n.readAt ? '' : ' unread'}`}>
                  <span className={`note-icon${n.kind === 'walk-overdue' ? ' warn' : ''}`}>
                    <Icon name={ICONS[n.kind] ?? 'bell'} size={18} />
                  </span>
                  <span className="grow stack-s">
                    <span>{t.has(`kinds.${n.kind}`) ? t(`kinds.${n.kind}`, notificationValues(data)) : n.kind}</span>
                    <span className="muted small">{format.relativeTime(n.createdAt)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {hasUnread ? <MarkNotificationsRead /> : null}
    </div>
  )
}
