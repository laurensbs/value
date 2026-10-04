import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon, type IconName } from '@/components/Icon'
import { MarkNotificationsRead } from '@/components/MarkNotificationsRead'
import { notificationHref, notificationValues, type NotificationData } from '@/lib/notification-links'
import { seintjesStopped } from '@/server/nudges'
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
  'nudge-challenge': 'trophy',
  'challenge-done': 'trophy',
  'nudge-new-dog': 'paw',
  'nudge-owner': 'home',
}

export default async function NotificationsPage() {
  const viewer = await requireViewer('/notifications')
  const [items, stopped, t, nav] = await Promise.all([
    notificationsFor(viewer.userId),
    viewer.profile ? seintjesStopped(viewer.userId, viewer.profile.reminders) : false,
    getTranslations('notifications'),
    getTranslations('nav'),
  ])
  const format = await getFormatter()
  const hasUnread = items.some((n) => !n.readAt)

  return (
    <div className="narrow-page stack-l">
      <h1>{t('title')}</h1>
      {/* Seintjes went off by themselves: said once, here, never as a push. */}
      {stopped ? <p className="muted">{t.rich('stopped', { tab: nav('profile'), link: (chunks) => <Link href="/profile#alerts">{chunks}</Link> })}</p> : null}
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
