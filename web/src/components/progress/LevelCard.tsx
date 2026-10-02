import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LevelRing } from './LevelRing'
import { ProgressIcon } from './ProgressIcon'
import type { ProgressData } from './types'

/**
 * Where you are and how far it is to the next level, like the card in the iPhone app.
 * `link` is the compact card on the profile that opens the progress page; without it, the big version.
 */
export async function LevelCard({ progress: p, link = false }: { progress: ProgressData; link?: boolean }) {
  const t = await getTranslations()
  const earned = p.badges.filter((b) => b.tier > 0).length
  const toNext =
    p.level.next != null && p.level.nextName
      ? t('progress.toNext', { n: Math.max(0, p.level.next - p.points), name: p.level.nextName })
      : t('progress.top')
  const body = (
    <>
      <LevelRing level={p.level.number} progress={p.level.progress} size={link ? 68 : 96} stroke={link ? 8 : 10} label={t('progressPage.ringLabel', { n: p.level.number, name: p.level.name })} />
      <span className="level-card-text">
        {link ? null : <span className="level-card-eyebrow">{t('progressPage.levelLine', { n: p.level.number, points: p.points })}</span>}
        <strong className="level-card-name">{p.level.name}</strong>
        <span className="level-card-next">{toNext}</span>
        <span className="level-card-badges">
          <ProgressIcon name="award" size={16} /> {t('profileHub.levelBadges', { n: earned })}
        </span>
      </span>
    </>
  )
  if (link) {
    return (
      <Link href="/profile/progress" className="level-card is-link" aria-label={`${t('progress.card')}: ${p.level.name}. ${toNext}`}>
        {body}
        <span className="level-card-chevron">
          <ProgressIcon name="chevron" size={20} />
        </span>
      </Link>
    )
  }
  return <div className="level-card is-hero">{body}</div>
}
