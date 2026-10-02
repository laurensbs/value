import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { APP_NAME } from '@/lib/site'
import { LandingIcon } from './LandingIcon'

const SHOTS = [
  { key: 'discover', src: '/app/ontdek.webp', icon: 'paw' },
  { key: 'owner', src: '/app/eigenaar.webp', icon: 'home' },
  { key: 'walk', src: '/app/wandelen.webp', icon: 'location' },
] as const

/** Real screens from the iPhone app in drawn phone frames, with an honest note: the website works today. */
export async function PhoneShowcase() {
  const t = await getTranslations()
  return (
    <section className="lp-showcase" aria-labelledby="lp-showcase-title">
      <div className="lp-showcase-copy">
        <p className="lp-eyebrow on-dark">{t('landing.app.eyebrow')}</p>
        <h2 id="lp-showcase-title" className="lp-h2">
          {t('landing.app.title')}
        </h2>
        <p className="lp-showcase-lede">{t('landing.app.lede')}</p>
        <ul className="lp-shot-legend">
          {SHOTS.map((s) => (
            <li key={s.key}>
              <span className="lp-legend-icon" aria-hidden="true">
                <Icon name={s.icon} size={18} />
              </span>
              <span>
                <strong>{t(`landing.app.${s.key}.title`)}</strong> {t(`landing.app.${s.key}.text`)}
              </span>
            </li>
          ))}
        </ul>
        <div className="lp-soon">
          <span className="lp-soon-pill">
            <LandingIcon name="sun" size={16} />
            {t('landing.app.soon')}
          </span>
          <p>{t('landing.app.today', { app: APP_NAME })}</p>
        </div>
        <div>
          <Link href="/dogs" className="button ball lp-cta">
            {t('home.ctaDogs')}
            <Icon name="arrow" size={18} />
          </Link>
        </div>
      </div>
      <figure className="lp-phones">
        <div className="lp-phone-row">
          {SHOTS.map((s, i) => (
            <div key={s.key} className={`lp-phone n${i}`}>
              <Image src={s.src} alt={t(`landing.app.${s.key}.alt`)} width={600} height={1305} sizes="(min-width: 900px) 220px, 34vw" unoptimized />
            </div>
          ))}
        </div>
        <figcaption className="lp-phones-note">{t('landing.app.note')}</figcaption>
      </figure>
    </section>
  )
}
