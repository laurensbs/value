import { getFormatter, getTranslations } from 'next-intl/server'
import { LevelRing } from '@/components/progress/LevelRing'
import { ProgressIcon, type ProgressIconName } from '@/components/progress/ProgressIcon'
import type { LaunchData } from '@/server/launch'
import type { MilestoneId } from '@/server/launch-core'

const BADGE_ICONS: Record<MilestoneId, ProgressIconName> = {
  firstShelter: 'building',
  firstIntro: 'heart',
  firstWalk: 'paw',
  members10: 'users',
  members50: 'home',
  members100: 'star',
}

/**
 * The admin's own launch game: a level (Pup → Wandelaar → Roedelleider), the road to the first
 * real walk, the way to 100 members and a badge per milestone. No streaks, no deadlines.
 */
export async function GameCard({ data }: { data: Pick<LaunchData, 'level' | 'points' | 'route' | 'milestones' | 'members'> }) {
  const t = await getTranslations('launch.game')
  const tm = await getTranslations('launch.milestones')
  const tl = await getTranslations('launch')
  const format = await getFormatter()
  const { level, points, route, milestones, members } = data
  const name = t(`levels.${level.key}`)
  const memberPct = Math.min(100, members)

  return (
    <section id="voortgang" className="stack launch-game" aria-labelledby="launch-game-title">
      <h2 id="launch-game-title">{t('title')}</h2>
      <div className="level-card is-hero">
        <LevelRing level={level.number} progress={level.progress} size={88} stroke={9} label={t('ring', { n: level.number, name })} />
        <span className="level-card-text">
          <span className="level-card-eyebrow">{t('points', { n: points })}</span>
          <strong className="level-card-name">{name}</strong>
          <span className="level-card-next">{level.next ? t('toNext', { n: level.toNext, name: t(`levels.${level.next.key}`) }) : t('top')}</span>
        </span>
      </div>

      <div className="card stack-s">
        <div className="spread">
          <h3>{t('routeTitle')}</h3>
          <span className="pill green">{t('routeCount', { done: route.done, total: route.total })}</span>
        </div>
        <ol className="launch-route">
          {route.steps.map((step, i) => {
            const here = !step.done && route.steps.slice(0, i).every((s) => s.done)
            return (
              <li key={step.key} className={step.done ? 'passed' : here ? 'here' : undefined} aria-current={here ? 'step' : undefined}>
                <span className="launch-route-dot">{step.done ? <ProgressIcon name="check" size={14} /> : i + 1}</span>
                <span className="launch-route-name">{t(`routeSteps.${step.key}`)}</span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="card stack-s">
        <div className="spread">
          <h3>{t('membersTitle')}</h3>
          <span className="pill green">{t('membersCount', { n: members })}</span>
        </div>
        <div className="launch-members">
          <span className="bar big" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(members, 100)} aria-label={t('membersTitle')}>
            <span style={{ width: `${memberPct > 0 ? Math.max(3, memberPct) : 0}%` }} />
          </span>
          <span className="launch-members-marks" aria-hidden="true">
            {[10, 50, 100].map((n) => (
              <span key={n} className={members >= n ? 'reached' : undefined} style={{ left: `${n}%` }}>
                {n}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="stack-s">
        <h3>{t('badgesTitle')}</h3>
        <ul className="badge-grid">
          {milestones.map((m) => (
            <li key={m.id} className={`badge${m.reached ? ' earned' : ''}`} data-color={m.reached ? (m.id.startsWith('members') ? 'gold' : 'ball') : undefined}>
              <span className="badge-medal" aria-hidden="true">
                <ProgressIcon name={BADGE_ICONS[m.id]} size={26} />
              </span>
              <span className="badge-name">{tm(`${m.id}.badge`)}</span>
              <strong className="badge-title">{tm(`${m.id}.title`)}</strong>
              {m.reached ? (
                <span className="badge-meta">
                  {m.at ? tm('reachedOn', { date: format.dateTime(m.at, { day: 'numeric', month: 'long', year: 'numeric' }) }) : tm('reached')} · {tl('pointsShort', { n: m.points })}
                </span>
              ) : (
                <span className="badge-hint">
                  {m.target > 1 ? tm('progress', { current: m.current, target: m.target }) : tm('notYet')} · {tl('pointsShort', { n: m.points })}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <p className="muted small">{t('noPressure')}</p>
    </section>
  )
}
