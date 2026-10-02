import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { MarkNotificationsRead } from '@/components/MarkNotificationsRead'
import { notificationsFor } from '@/server/queries'
import { requireViewer } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('notifications')
  return { title: t('title') }
}

type Data = { walkId?: string; dogId?: string; dogName?: string; walkerName?: string; requestId?: string; orgId?: string }

function hrefFor(kind: string, data: Data): string {
  if (kind.startsWith('request-')) return '/requests'
  if (kind === 'walk-started' || kind === 'walk-overdue' || kind === 'walk-ended') return data.walkId ? `/walk/${data.walkId}` : '/requests'
  if (kind === 'trust-granted' && data.dogId) return `/dogs/${data.dogId}`
  if (kind === 'org-verified' && data.orgId) return `/shelter/${data.orgId}`
  if (kind === 'group-signup') return '/shelter'
  return '/requests'
}

const ICONS: Record<string, 'paw' | 'route' | 'alert' | 'shield' | 'users' | 'building' | 'bell'> = {
  'request-new': 'paw',
  'request-accepted': 'paw',
  'walk-started': 'route',
  'walk-ended': 'route',
  'walk-overdue': 'alert',
  'trust-granted': 'shield',
  'group-signup': 'users',
  'org-verified': 'building',
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
            const data = (n.data ?? {}) as Data
            return (
              <li key={n.id}>
                <Link href={hrefFor(n.kind, data)} className={`list-item notification${n.readAt ? '' : ' unread'}`}>
                  <span className={`note-icon${n.kind === 'walk-overdue' ? ' warn' : ''}`}>
                    <Icon name={ICONS[n.kind] ?? 'bell'} size={18} />
                  </span>
                  <span className="grow stack-s">
                    <span>
                      {t.has(`kinds.${n.kind}`)
                        ? t(`kinds.${n.kind}`, { dogName: data.dogName ?? '', walkerName: data.walkerName ?? '' })
                        : n.kind}
                    </span>
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
