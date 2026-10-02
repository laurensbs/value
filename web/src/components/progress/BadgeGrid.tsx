import { getFormatter, getTranslations } from 'next-intl/server'
import type { BadgeIcon } from '@/lib/progress'
import { ProgressIcon, type ProgressIconName } from './ProgressIcon'
import type { BadgeData } from './types'

const ICONS: Record<BadgeIcon, ProgressIconName> = {
  paw: 'paw',
  heart: 'heart',
  users: 'users',
  sun: 'sun',
  moon: 'moon',
  calendar: 'calendar',
  leaf: 'leaf',
  camera: 'camera',
  list: 'list',
  building: 'building',
  shield: 'shield',
  home: 'home',
  share: 'share',
}

export function badgeIcon(icon: string): ProgressIconName {
  return ICONS[icon as BadgeIcon] ?? 'award'
}

/** Every badge: earned ones in their tier colour, the rest as soft outlines that say how to earn them. */
export async function BadgeGrid({ badges }: { badges: BadgeData[] }) {
  const t = await getTranslations('progressPage')
  const tp = await getTranslations('progress')
  const format = await getFormatter()
  return (
    <ul className="badge-grid">
      {badges.map((b) => {
        const earned = b.tier > 0
        const fraction = b.next ? Math.min(1, b.value / b.next) : 1
        return (
          <li key={b.key} className={`badge${earned ? ' earned' : ''}`} data-color={b.color ?? undefined}>
            <span className="badge-medal" aria-hidden="true">
              <ProgressIcon name={badgeIcon(b.icon)} size={26} />
              {b.new ? <span className="badge-new">{t('badgeNew')}</span> : null}
            </span>
            <span className="badge-name">{b.name}</span>
            <strong className="badge-title">{b.title}</strong>
            {earned ? (
              <span className="badge-meta">
                {b.earnedAt ? t('badgeEarnedOn', { date: format.dateTime(new Date(b.earnedAt), { day: 'numeric', month: 'long' }) }) : t('badgeEarned')}
              </span>
            ) : (
              <span className="badge-hint">{b.hint}</span>
            )}
            {b.next ? (
              <span className="badge-progress">
                <span className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={b.next} aria-valuenow={Math.min(b.value, b.next)} aria-label={b.nextTitle ?? b.title}>
                  <span style={{ width: `${fraction > 0 ? Math.max(4, fraction * 100) : 0}%` }} />
                </span>
                <span className="badge-meta">
                  {earned && b.nextTitle ? t('badgeNext', { title: b.nextTitle }) : tp('badgeProgress', { value: b.value, next: b.next })}
                </span>
              </span>
            ) : earned && b.tiers.length > 1 ? (
              <span className="badge-meta">{tp('badgeDone')}</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
