import { getTranslations } from 'next-intl/server'
import type { MonthChallenges } from '@/lib/challenges'
import { challengesJson } from '@/server/progress-json'
import { Icon, type IconName } from './Icon'

const SEASON_ICON: Record<MonthChallenges['season'], IconName> = { winter: 'star', spring: 'leaf', summer: 'sun', autumn: 'leaf' }

/** "Utrecht walks 50 rounds in October": the town's monthly goal, and everyone's together. */
export async function ChallengeCard({ challenges }: { challenges: MonthChallenges }) {
  const t = await getTranslations('challenges')
  const c = await challengesJson(challenges)
  const main = c.city ?? c.all

  return (
    <section className={`card challenge-card ${c.season}`} aria-labelledby="challenge-title" id="challenge">
      {/* No countdown ("Nog # dagen"): the month's goal is shared, never a deadline. */}
      <p className="eyebrow">
        <Icon name={SEASON_ICON[c.season]} size={14} /> {t('title')}
      </p>
      <h2 id="challenge-title">{main.title}</h2>
      <div className="challenge-bar" role="progressbar" aria-labelledby="challenge-title" aria-valuemin={0} aria-valuemax={main.goal} aria-valuenow={Math.min(main.walks, main.goal)} aria-valuetext={main.progressText}>
        <span style={{ width: `${Math.min(100, (main.walks / main.goal) * 100)}%` }} />
      </div>
      <div className="spread">
        <strong>{main.progressText}</strong>
        {main.walks > 0 ? <span className="muted small">{main.statsText}</span> : null}
      </div>
      <p className="small">{main.done ? t('done') : t('mine', { n: main.mine })}</p>
      {c.city ? (
        <p className="muted small">
          {c.all.title}: {c.all.progressText}
        </p>
      ) : null}
      <p className="muted small">{t('private')}</p>
    </section>
  )
}
