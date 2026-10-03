import { getTranslations } from 'next-intl/server'
import { ProgressIcon } from './ProgressIcon'
import type { ChallengesData } from './types'

/** "Utrecht loopt 10 rondjes in oktober": a shared goal with only totals, never who walked. */
export async function ChallengeCard({ challenges: c }: { challenges: ChallengesData }) {
  const t = await getTranslations('challenges')
  const tp = await getTranslations('progressPage')
  const goal = c.city ?? c.all
  const fraction = Math.min(1, goal.walks / Math.max(1, goal.goal))
  return (
    <section className="card challenge-card stack-s" aria-labelledby="challenge-title">
      <div className="spread">
        <span className="challenge-eyebrow">
          <ProgressIcon name="users" size={18} /> {tp('challengeEyebrow')}
        </span>
        <span className="muted small">{t('daysLeft', { n: c.daysLeft })}</span>
      </div>
      <h2 id="challenge-title" className="challenge-title">
        {goal.title}
      </h2>
      <span
        className={`bar big${goal.done ? ' done' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal.goal}
        aria-valuenow={Math.min(goal.walks, goal.goal)}
        aria-label={goal.progressText}
      >
        <span style={{ width: `${Math.max(3, fraction * 100)}%` }} />
      </span>
      <div className="spread">
        <strong>{goal.progressText}</strong>
        {goal.mine > 0 ? (
          <span className="challenge-mine">
            <ProgressIcon name="heart" size={16} /> {tp('mineShort', { n: goal.mine })}
          </span>
        ) : (
          <span className="muted small">{t('mine', { n: 0 })}</span>
        )}
      </div>
      <p className="muted small">{goal.statsText}</p>
      {goal.done ? <p className="notice success small">{t('done')}</p> : null}
      {c.city ? <p className="small">{tp('challengeEveryone', { walks: c.all.walks, goal: c.all.goal })}</p> : null}
      <p className="muted small">{t('private')}</p>
    </section>
  )
}
