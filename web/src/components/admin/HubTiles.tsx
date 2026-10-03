import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { AdminHub } from '@/server/admin-hub'
import { AdminIcon, type AdminNavItem } from './AdminNav'

interface Tile {
  href: string
  icon: AdminNavItem['icon']
  title: string
  text: string
  /** A count on the tile, only when something waits. */
  badge?: number
  tone?: 'urgent' | 'attention'
}

/** The big tiles on the admin home: one per section, each with a live count. */
export async function HubTiles({ tiles, urgentReports }: { tiles: AdminHub['tiles']; urgentReports: boolean }) {
  const t = await getTranslations('adminHub.tiles')
  const { launch, moderation, shelters, tips, numbers } = tiles
  const waiting = moderation.reports + moderation.signals
  const list: Tile[] = [
    {
      href: '/admin/launch',
      icon: 'flag',
      title: t('launch.title'),
      text: launch.open ? t('launch.open', { open: launch.open, total: launch.total }) : t('launch.done'),
      badge: launch.open || undefined,
    },
    { href: '/admin/marketing', icon: 'sparkle', title: t('marketing.title'), text: t('marketing.text') },
    {
      href: '/admin/moderation',
      icon: 'shield',
      title: t('moderation.title'),
      text: t('moderation.text', { reports: moderation.reports, signals: moderation.signals }),
      badge: waiting || undefined,
      tone: urgentReports ? 'urgent' : waiting ? 'attention' : undefined,
    },
    {
      href: '/admin/shelters',
      icon: 'building',
      title: t('shelters.title'),
      text: t('shelters.text', { n: shelters.pending }),
      badge: shelters.pending || undefined,
      tone: shelters.pending ? 'attention' : undefined,
    },
    {
      href: '/admin/tips',
      icon: 'heart',
      title: t('tips.title'),
      text: t('tips.text', { n: tips.open }),
      badge: tips.open || undefined,
      tone: tips.open ? 'attention' : undefined,
    },
    { href: '/admin/numbers', icon: 'chart', title: t('numbers.title'), text: t('numbers.text', { n: numbers.walksWeek, running: numbers.running }) },
  ]

  return (
    <nav className="admin-tiles" aria-label={t('label')}>
      {list.map((tile) => (
        <Link key={tile.href} href={tile.href} className={`admin-tile${tile.tone ? ` is-${tile.tone}` : ''}`}>
          <span className="admin-tile-top">
            <span className="admin-tile-icon">
              <AdminIcon name={tile.icon} size={24} />
            </span>
            {/* The text under the title says the same in words, so screen readers skip the badge. */}
            {tile.badge ? (
              <span className="admin-tile-badge" aria-hidden="true">
                {tile.badge > 99 ? '99+' : tile.badge}
              </span>
            ) : null}
          </span>
          <span className="admin-tile-title">{tile.title}</span>
          <span className="admin-tile-text">{tile.text}</span>
        </Link>
      ))}
    </nav>
  )
}
