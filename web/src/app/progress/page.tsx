import '../progress.css'
import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { ChallengeCard } from '@/components/ChallengeCard'
import { FirstSteps } from '@/components/discover/HomeCards'
import { DogPortrait } from '@/components/DogPortrait'
import { Icon } from '@/components/Icon'
import { Medal } from '@/components/Medal'
import { LevelUp } from '@/components/progress/LevelUp'
import { WeekCard } from '@/components/WeekCard'
import { WeeklyGoalPicker } from '@/components/WeeklyGoalPicker'
import { bondFor, KIND_KEYS, LEVEL_KEYS, LEVELS, POINTS, type PointKind } from '@/lib/progress'
import { challengesFor } from '@/server/challenges'
import { dogFriendsFor, progressFor, rolesOf } from '@/server/progress'
import { levelMoment, progressJson } from '@/server/progress-json'
import { impactTotals } from '@/server/queries'
import { requireOnboarded } from '@/server/session'

export async function generateMetadata() {
  const t = await getTranslations('progress')
  return { title: t('title') }
}

// Owners see what fits them first; everything earned stays visible to everyone.
const WALKER_EARN: PointKind[] = ['walk', 'walk-care', 'walk-photo', 'feedback', 'group-walk', 'quiz', 'profile', 'invite']
const OWNER_EARN: PointKind[] = ['dog-walked', 'first-dog', 'profile', 'invite']

/** Levels, badges, dog friends and the town's challenge: private, playful, never taken away. */
export default async function ProgressPage() {
  const viewer = await requireOnboarded('/progress')
  const now = new Date()
  const { walker, owner } = rolesOf(viewer.profile)
  const [t, tt, tf, format, progress, challenges, friends, impact] = await Promise.all([
    getTranslations('progress'),
    getTranslations('today'),
    getTranslations('profile'),
    getFormatter(),
    progressFor(viewer, now),
    challengesFor(viewer, now),
    walker ? dogFriendsFor(viewer.userId) : Promise.resolve([]),
    impactTotals(),
  ])
  const json = await progressJson(progress)
  const earn = [...new Set([...(walker ? WALKER_EARN : []), ...(owner ? OWNER_EARN : [])])]
  const earned = json.badges.filter((b) => b.tier > 0).length
  const moment = levelMoment(progress, json)

  return (
    <div className="progress-page">
      <header className="level-hero">
        <span className="level-badge huge" style={{ '--p': json.level.progress } as React.CSSProperties} aria-hidden="true">
          {json.level.number}
        </span>
        <div className="stack-s">
          <p className="eyebrow">
            {t('title')} · {t('levelN', { n: json.level.number })}
          </p>
          <h1>{json.level.name}</h1>
          <p className="lede">{t('points', { n: json.points })}</p>
          <div className="level-progress" role="progressbar" aria-labelledby="level-next" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(json.level.progress * 100)}>
            <span style={{ width: `${json.level.progress * 100}%` }} />
          </div>
          <p className="small" id="level-next">
            {json.level.next != null && json.level.nextName ? t('toNext', { n: json.level.next - json.points, name: json.level.nextName }) : t('top')}
          </p>
        </div>
      </header>

      {/* Your first steps, all of them, until they are done. Vandaag shows only the next one. */}
      <div id="steps">
        <FirstSteps steps={json.steps} />
      </div>

      <p className="notice">
        <Icon name="lock" size={18} />
        <span>{t('private')}</span>
      </p>

      <div className="today-grid">
        {/* The week only counts once there is something to count: after your first walk. */}
        {walker && progress.activeWeeks > 0 ? (
          <WeekCard goal={progress.weeklyGoal} walks={progress.walksThisWeek} days={progress.weekDays} activeWeeks={progress.activeWeeks} now={now} />
        ) : walker ? (
          // Before the first walk: nothing to count yet, but the goal can be set or changed in one tap.
          <section className="card stack-s goal-card" aria-labelledby="goal-title">
            <h2 id="goal-title" className="small-title">
              {tf('weeklyGoal')}
            </h2>
            <p className="muted small">{tf('weeklyGoalHint')}</p>
            <WeeklyGoalPicker current={progress.weeklyGoal} />
          </section>
        ) : null}
        <ChallengeCard challenges={challenges} />
      </div>
      {impact.walks > 0 ? <p className="together muted small">{tt('together', { walks: impact.walks, dogs: impact.dogs })}</p> : null}

      <section className="stack" aria-labelledby="badges-title">
        <div className="section-title">
          <h2 id="badges-title">{t('badgesTitle')}</h2>
          <span className="muted small">{t('badgesEarned', { n: earned, total: json.badges.length })}</span>
        </div>
        <ul className="badge-grid">
          {json.badges.map((b) => (
            <li key={b.key} className={`badge-item${b.tier ? ' earned' : ''}${b.new ? ' new' : ''}`}>
              <Medal icon={b.icon} color={b.color} size={60} />
              <div className="stack-s">
                <strong>{b.name}</strong>
                <span className="small">{b.tier ? b.title : b.hint}</span>
                {b.next != null ? (
                  <>
                    <span className="badge-bar" aria-hidden="true">
                      <span style={{ width: `${Math.min(100, (b.value / b.next) * 100)}%` }} />
                    </span>
                    <span className="muted small">
                      {b.nextTitle} · {t('badgeProgress', { value: Math.min(b.value, b.next), next: b.next })}
                    </span>
                  </>
                ) : (
                  <span className="muted small">{t('badgeDone')}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {walker ? (
        <section className="stack" aria-labelledby="friends-title">
          <h2 id="friends-title">{t('friends.title')}</h2>
          {friends.length ? (
            <ul className="friend-list">
              {friends.map((f) => (
                <li key={f.dog.id}>
                  <Link href={`/dogs/${f.dog.id}`} className="friend">
                    <DogPortrait dog={f.dog} size={64} decorative />
                    <span className="stack-s">
                      <strong>{f.dog.name}</strong>
                      <span className={`pill ${bondFor(f.walks) === 'best' ? 'ball' : 'green'}`}>{t(`friends.bond.${bondFor(f.walks)}`)}</span>
                      <span className="muted small">{t('friends.walks', { n: f.walks })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card flat muted">{t('friends.empty')}</p>
          )}
        </section>
      ) : null}

      {/* Reference, not news: the whole path and how points come in, folded until you want them. */}
      <details className="fold">
        <summary id="path-title">{t('pathTitle')}</summary>
        <ol className="level-path">
          {LEVEL_KEYS.map((key, i) => {
            const n = i + 1
            const state = n < json.level.number ? 'done' : n === json.level.number ? 'here' : 'later'
            return (
              <li key={key} className={state} aria-current={state === 'here' ? 'step' : undefined}>
                <span className="level-stone">{state === 'done' ? <Icon name="check" size={16} /> : n}</span>
                <span className="stack-s">
                  <strong>{t(`levels.${key}`)}</strong>
                  <span className="muted small">{state === 'here' ? t('pathHere') : t('points', { n: LEVELS[i] })}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </details>

      <details className="fold">
        <summary id="earn-title">{t('earnTitle')}</summary>
        <ul className="earn-list">
          {earn.map((kind) => (
            <li key={kind}>
              <span>{t(`earn.${KIND_KEYS[kind]}`)}</span>
              <span className="pill ball">+{POINTS[kind]}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">{t('earnNote')}</p>
      </details>

      <section className="stack" aria-labelledby="recent-title">
        <h2 id="recent-title">{t('recentTitle')}</h2>
        {json.recent.length ? (
          <ul className="recent-list">
            {json.recent.map((r, i) => (
              <li key={i}>
                <span className="stack-s">
                  <span>{r.label}</span>
                  <span className="muted small">{format.relativeTime(r.at, now)}</span>
                </span>
                <strong className="recent-points">+{r.points}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card flat muted">{t('none')}</p>
        )}
      </section>

      {moment ? <LevelUp celebration={moment} /> : null}
    </div>
  )
}
