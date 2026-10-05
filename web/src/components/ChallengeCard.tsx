import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { challengeView, type MonthChallenges } from '@/lib/challenges'
import { challengesJson } from '@/server/progress-json'
import { Icon, type IconName } from './Icon'

const SEASON_ICON: Record<MonthChallenges['season'], IconName> = { winter: 'star', spring: 'leaf', summer: 'sun', autumn: 'leaf' }

/**
 * "Utrecht walks 50 rounds in October": the town's monthly goal, and everyone's together. An honest
 * empty town: before the first walk no numbers, but where to start. Totals only when they cannot
 * point at one person, and never how many walkers.
 */
export async function ChallengeCard({ challenges }: { challenges: MonthChallenges }) {
  const t = await getTranslations()
  const c = await challengesJson(challenges)
  const main = c.city ?? c.all
  const view = challengeView(main)

  return (
    <section className={`card challenge-card ${c.season}`} aria-labelledby="challenge-title" id="challenge">
      {/* No countdown ("Nog # dagen"): the month's goal is shared, never a deadline. */}
      <p className="eyebrow">
        <Icon name={SEASON_ICON[c.season]} size={14} /> {t('challenges.title')}
      </p>
      {view.empty ? (
        <>
          <h2 id="challenge-title">{t('challenges.start')}</h2>
          <p>{t('challenges.empty')}</p>
          <div className="row">
            <Link href="/group-walks" className="button secondary small">
              {t('nav.groupWalks')}
            </Link>
            <Link href="/suggest?kind=shelter" className="button ghost small">
              {t('dogs.tipShelter')}
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2 id="challenge-title">{main.title}</h2>
          <div className="challenge-bar" role="progressbar" aria-labelledby="challenge-title" aria-valuemin={0} aria-valuemax={main.goal} aria-valuenow={Math.min(main.walks, main.goal)} aria-valuetext={main.progressText}>
            <span style={{ width: `${Math.min(100, (main.walks / main.goal) * 100)}%` }} />
          </div>
          <div className="spread">
            <strong>{main.progressText}</strong>
            {view.totals ? <span className="muted small">{t('challenges.totals', { dogs: main.dogs, km: main.km })}</span> : null}
          </div>
          <p className="small">{main.done ? t('challenges.done') : t('challenges.mine', { n: main.mine })}</p>
          {c.city && c.all.walks > 0 ? (
            <p className="muted small">
              {c.all.title}: {c.all.progressText}
            </p>
          ) : null}
        </>
      )}
      <p className="muted small">{t('challenges.private')}</p>
    </section>
  )
}
