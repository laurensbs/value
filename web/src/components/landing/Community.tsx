import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { COUNTRIES } from '@/lib/countries'
import { daysLeft } from '@/server/progress-json'
import { IMPACT_MIN_WALKS, impactTotals } from '@/server/queries'
import { homeChallenge } from './challenge'
import { Flag } from './Flag'

// Below this many walkers we only show the count of walks, so nobody can be picked out of a small town.
const MIN_WALKERS_FOR_STATS = 3

/** The living part of the home page: this month's shared challenge, totals, and where Rondje works. */
export async function Community() {
  const t = await getTranslations()
  const format = await getFormatter()
  const [month, impact] = await Promise.all([homeChallenge(), impactTotals()])
  const c = month.city && month.city.walks > 0 ? month.city : month.all
  const monthName = format.dateTime(new Date((month.startsAt.getTime() + month.endsAt.getTime()) / 2), { month: 'long' })
  const title = month.city && c === month.city ? t('challenges.city', { city: month.city.name, goal: c.goal, month: monthName }) : t('challenges.all', { goal: c.goal, month: monthName })
  const pct = Math.min(100, Math.round((c.walks / c.goal) * 100))

  return (
    <section className="lp-community" aria-labelledby="lp-community-title">
      <article className="lp-card lp-challenge">
        <div className="lp-challenge-head">
          <span className="lp-challenge-label">
            <Icon name="users" size={20} />
            {t('landing.community.eyebrow')}
          </span>
          <span className="muted small">{t('challenges.daysLeft', { n: daysLeft(month) })}</span>
        </div>
        <h2 id="lp-community-title" className="lp-challenge-title">
          {title}
        </h2>
        <div
          className="lp-progress"
          role="progressbar"
          aria-labelledby="lp-community-title"
          aria-valuemin={0}
          aria-valuemax={c.goal}
          aria-valuenow={Math.min(c.walks, c.goal)}
          aria-valuetext={t('challenges.progress', { walks: c.walks, goal: c.goal })}
        >
          <span style={{ width: `${Math.max(pct, c.walks > 0 ? 4 : 0)}%` }} />
        </div>
        {c.walks > 0 ? (
          <div className="lp-challenge-numbers">
            <strong>{c.done ? t('challenges.done') : t('challenges.progress', { walks: c.walks, goal: c.goal })}</strong>
            {c.walkers >= MIN_WALKERS_FOR_STATS ? <span className="muted small">{t('challenges.stats', { dogs: c.dogs, walkers: c.walkers, km: c.km })}</span> : null}
          </div>
        ) : (
          <p className="lp-challenge-numbers">
            <strong>{t('landing.community.first', { month: monthName })}</strong>
          </p>
        )}
        <div className="lp-challenge-foot">
          <p className="muted small">
            <Icon name="lock" size={15} /> {t('challenges.private')}
          </p>
          <Link href="/dogs" className="button primary small">
            {t('landing.community.join')}
          </Link>
        </div>
        {impact.walks >= IMPACT_MIN_WALKS ? (
          <dl className="lp-impact" aria-label={t('home.impactTitle')}>
            <div>
              <dt>{t('home.impactWalks')}</dt>
              <dd>{format.number(impact.walks)}</dd>
            </div>
            <div>
              <dt>{t('home.impactKm')}</dt>
              <dd>{format.number(impact.km)}</dd>
            </div>
            <div>
              <dt>{t('home.impactDogs')}</dt>
              <dd>{format.number(impact.dogs)}</dd>
            </div>
          </dl>
        ) : null}
      </article>

      <article className="lp-card lp-countries">
        <h2 className="lp-h3">{t('home.countriesTitle')}</h2>
        <p className="muted">{t('home.countriesText')}</p>
        <ul className="lp-country-list">
          {COUNTRIES.map((code) => (
            <li key={code}>
              <Flag country={code} />
              {t(`common.countries.${code}`)}
            </li>
          ))}
        </ul>
        <Link href="/cities" className="link-button">
          {t('landing.countries.link')} →
        </Link>
      </article>
    </section>
  )
}
