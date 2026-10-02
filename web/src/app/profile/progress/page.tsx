import '../../progress.css'
import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { BadgeGrid } from '@/components/progress/BadgeGrid'
import { ChallengeCard } from '@/components/progress/ChallengeCard'
import { LevelCard } from '@/components/progress/LevelCard'
import { LevelUp } from '@/components/progress/LevelUp'
import { ProgressIcon } from '@/components/progress/ProgressIcon'
import { WeekGoal } from '@/components/progress/WeekGoal'
import { KIND_KEYS, LEVEL_KEYS, LEVELS, POINTS, type PointKind } from '@/lib/progress'
import { challengesFor } from '@/server/challenges'
import { progressFor } from '@/server/progress'
import { challengesJson, progressJson } from '@/server/progress-json'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('progress')
  return { title: t('title'), robots: { index: false } }
}

const WALKER_KINDS: PointKind[] = ['walk', 'walk-care', 'walk-photo', 'feedback', 'group-walk', 'quiz']
const OWNER_KINDS: PointKind[] = ['dog-walked', 'first-dog', 'feedback']
const EVERYONE_KINDS: PointKind[] = ['profile', 'invite']

/** "Jouw voortgang": level, weekly goal, the month's challenge and every badge. Only for yourself. */
export default async function ProgressPage() {
  const viewer = await requireOnboarded('/profile/progress')
  const [p, c] = await Promise.all([progressFor(viewer).then(progressJson), challengesFor(viewer).then((x) => challengesJson(x))])
  const t = await getTranslations()
  const format = await getFormatter()
  const earned = p.badges.filter((b) => b.tier > 0).length
  const kinds = [...new Set([...(p.roles.walker ? WALKER_KINDS : []), ...(p.roles.owner ? OWNER_KINDS : []), ...EVERYONE_KINDS])]
  const celebration =
    p.levelUp || p.newAwards.length
      ? { level: p.level.number, name: p.level.name, levelUp: p.levelUp, awards: p.newAwards.map((a) => ({ key: a.key, title: a.title, color: a.color })) }
      : null

  return (
    <div className="narrow-page stack-l progress-page">
      <header className="stack-s">
        <Link href="/profile" className="link-button">
          ← {t('profile.title')}
        </Link>
        <div className="spread">
          <h1>{t('progress.title')}</h1>
          <span className="pill private-pill">
            <ProgressIcon name="lock" size={14} /> {t('progressPage.privateTag')}
          </span>
        </div>
        <p className="lede">{t('progressPage.lede')}</p>
      </header>

      <section className="stack" aria-label={t('progress.pathTitle')}>
        <LevelCard progress={p} />
        <ol className="level-path" aria-label={t('progress.pathTitle')}>
          {LEVEL_KEYS.map((key, i) => {
            const n = i + 1
            const state = n < p.level.number ? 'passed' : n === p.level.number ? 'here' : 'ahead'
            return (
              <li key={key} className={state} aria-current={state === 'here' ? 'step' : undefined}>
                <span className="level-path-dot">{n}</span>
                <span className="level-path-name">{t(`progress.levels.${key}`)}</span>
                <span className="visually-hidden">
                  {state === 'here' ? `${t('progress.pathHere')}. ` : ''}
                  {t('progress.points', { n: LEVELS[i] })}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="muted small private-note">
          <ProgressIcon name="lock" size={15} /> {t('progress.private')}
        </p>
      </section>

      <div className="progress-grid">
        <section className="card stack" aria-labelledby="week-title">
          <div className="spread">
            <h2 id="week-title">{t('profile.weeklyGoal')}</h2>
            <span className="muted small">{t('progress.weekTitle')}</span>
          </div>
          <WeekGoal goal={p.week.goal} walks={p.week.walks} activeWeeks={p.week.activeWeeks} />
        </section>
        <ChallengeCard challenges={c} />
      </div>

      <section className="stack" aria-labelledby="badges-title">
        <div className="section-title">
          <h2 id="badges-title">{t('progress.badgesTitle')}</h2>
          <span className="muted small">{t('progress.badgesEarned', { n: earned, total: p.badges.length })}</span>
        </div>
        <p className="muted">{t('progressPage.badgesLede')}</p>
        <BadgeGrid badges={p.badges} />
      </section>

      <div className="progress-grid">
        <section className="card stack-s" aria-labelledby="earn-title">
          <h2 id="earn-title">{t('progress.earnTitle')}</h2>
          <ul className="earn-list">
            {kinds.map((kind) => (
              <li key={kind}>
                <span>{t(`progress.earn.${KIND_KEYS[kind]}`)}</span>
                <strong>{t('progressPage.earnPoints', { n: POINTS[kind] })}</strong>
              </li>
            ))}
          </ul>
          <p className="muted small">{t('progress.earnNote')}</p>
        </section>
        <section className="card stack-s" aria-labelledby="recent-title">
          <h2 id="recent-title">{t('progress.recentTitle')}</h2>
          {p.recent.length ? (
            <ul className="earn-list">
              {p.recent.map((r, i) => (
                <li key={`${r.kind}-${i}`}>
                  <span>
                    {r.label}
                    <span className="muted small"> · {format.dateTime(new Date(r.at), { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <strong>{t('progressPage.earnPoints', { n: r.points })}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <div className="stack-s">
              <p className="muted">{t('progressPage.recentEmpty')}</p>
              <div>
                <Link href="/dogs" className="button primary small">
                  {t('progressPage.findDog')}
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      {celebration ? <LevelUp celebration={celebration} /> : null}
    </div>
  )
}
