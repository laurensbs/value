import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { APP_NAME } from '@/lib/site'
import { featuredFacts } from './facts'
import { ImpactStat } from './ImpactStat'
import '@/app/impact.css'

/**
 * Home page band: a few checked numbers about loneliness, moving and dogs, one honest sentence about what
 * a walk together adds, and a way to join or (on the website only) help make it possible.
 */
export async function ImpactBand({ native }: { native: boolean }) {
  const t = await getTranslations('impact')
  const locale = await getLocale()
  const facts = featuredFacts()
  if (!facts.length) return null

  return (
    <section className="im-band" aria-labelledby="im-band-title">
      <div className="im-band-head">
        <p className="lp-eyebrow">{t('band.eyebrow')}</p>
        <h2 id="im-band-title" className="lp-h2">
          {t('band.title')}
        </h2>
        <p className="lp-sub">{t('band.lede')}</p>
      </div>
      <ul className="im-stats" aria-label={t('band.factsLabel')}>
        {facts.map((f) => (
          <ImpactStat key={f.id} fact={f} locale={locale} sourceLabel={t('source', { name: f.source.name, year: String(f.year) })} />
        ))}
      </ul>
      <div className="im-band-adds">
        <span className="im-band-paw" aria-hidden="true">
          <Icon name="paw" size={22} />
        </span>
        <p>{t('band.adds', { app: APP_NAME })}</p>
        <div className="lp-ctas">
          <Link href="/dogs" className="button primary lp-cta">
            {t('band.join')}
            <Icon name="arrow" size={18} />
          </Link>
          {native ? null : (
            <Link href="/support" className="button secondary lp-cta">
              <Icon name="heart" size={18} />
              {t('band.support')}
            </Link>
          )}
        </div>
        <Link href="/waarom" className="link-button">
          {t('band.more')} →
        </Link>
      </div>
    </section>
  )
}
