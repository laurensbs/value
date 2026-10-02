import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { visitorCountry, visitorPosition } from '@/components/discover/visitor'
import { Icon } from '@/components/Icon'
import { Chooser } from '@/components/landing/Chooser'
import { Community } from '@/components/landing/Community'
import { DogPeek } from '@/components/landing/DogPeek'
import { DogStage } from '@/components/landing/DogStage'
import { DogTile } from '@/components/landing/DogTile'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { LandingIcon, PawMark } from '@/components/landing/LandingIcon'
import { TRIO } from '@/components/landing/looks'
import { IconTile, type Tone } from '@/components/landing/PageHero'
import { PhoneShowcase } from '@/components/landing/PhoneShowcase'
import { countryInfo, isCountry } from '@/lib/countries'
import { isNativeRequest } from '@/server/native'
import { listDogs } from '@/server/queries'
import { getViewer } from '@/server/session'
import './landing.css'

const SAFETY: { key: 1 | 2 | 3 | 4 | 5 | 6; icon: ReactNode; tone: Tone }[] = [
  { key: 1, icon: <Icon name="users" />, tone: 'green' },
  { key: 2, icon: <LandingIcon name="idcard" />, tone: 'blue' },
  { key: 3, icon: <Icon name="shield" />, tone: 'warm' },
  { key: 4, icon: <Icon name="location" />, tone: 'green' },
  { key: 5, icon: <Icon name="chat" />, tone: 'blue' },
  { key: 6, icon: <Icon name="flag" />, tone: 'rose' },
]

export default async function HomePage() {
  const t = await getTranslations()
  const viewer = await getViewer()
  const native = await isNativeRequest()
  // Dogs from the visitor's own country first, nearest first (same rule as /dogs).
  const country = viewer?.profile && isCountry(viewer.profile.country) ? viewer.profile.country : await visitorCountry()
  const near = (await visitorPosition(country)) ?? countryInfo(country).center
  const local = await listDogs({ country, near }, 4)
  const dogs = local.length ? local : await listDogs({}, 4)
  const ownerHref = viewer?.profile ? '/my-dogs/new' : '/signup?intent=owner'
  const bothHref = viewer?.profile ? '/my-dogs/new' : `/signup?next=${encodeURIComponent('/my-dogs/new')}`

  return (
    <div className="lp">
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-kicker">
            <span className="lp-kicker-dot" aria-hidden="true" />
            {t('home.eyebrow')}
          </p>
          <h1 className="lp-title">{t.rich('home.title', { mark: (chunks) => <mark>{chunks}</mark> })}</h1>
          <p className="lp-lede">{t('home.lede')}</p>
          <ul className="lp-pills">
            <li className="lp-pill green">
              <Icon name="heart" size={16} />
              {t('landing.pills.free')}
            </li>
            <li className="lp-pill blue">
              <LandingIcon name="hand" size={16} />
              {t('landing.pills.noAds')}
            </li>
            <li className="lp-pill warm">
              <Icon name="shield" size={16} />
              {t('landing.pills.adults')}
            </li>
          </ul>
          <div className="lp-ctas">
            <Link href="/dogs" className="button primary lp-cta">
              {t('home.ctaDogs')}
              <Icon name="arrow" size={18} />
            </Link>
            <Link href={ownerHref} className="button secondary lp-cta">
              {t('home.ctaOwner')}
            </Link>
          </div>
          <p className="lp-hero-aside">
            <Link href="/shelter">{t('landing.hero.shelterLink')} →</Link>
          </p>
        </div>
        <DogStage />
      </section>

      <Chooser ownerHref={ownerHref} bothHref={bothHref} />

      <DogPeek items={dogs} />

      <HowItWorks />

      {native ? null : <PhoneShowcase />}

      <section className="lp-safety" aria-labelledby="lp-safety-title">
        <div className="lp-section-head row-end">
          <div>
            <p className="lp-eyebrow">{t('landing.safety.eyebrow')}</p>
            <h2 id="lp-safety-title" className="lp-h2">
              {t('home.safetyTitle')}
            </h2>
          </div>
          <Link href="/safety" className="link-button">
            {t('home.safetyMore')} →
          </Link>
        </div>
        <ul className="lp-features grouped">
          {SAFETY.map((s) => (
            <li key={s.key} className="lp-card lp-feature">
              <IconTile tone={s.tone}>{s.icon}</IconTile>
              <div>
                <h3>{t(`landing.safety.t${s.key}`)}</h3>
                <p>{t(`home.safety${s.key}`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Community />

      <section className="lp-free" aria-labelledby="lp-free-title">
        <div className="lp-free-copy">
          <IconTile tone="ball" size="l">
            <Icon name="heart" size={28} />
          </IconTile>
          <h2 id="lp-free-title" className="lp-h2">
            {t('home.freeTitle')}
          </h2>
          <p>{t('home.freeText')}</p>
          <ul className="lp-free-points">
            {(['ads', 'subscription', 'data'] as const).map((k) => (
              <li key={k}>
                <Icon name="check" size={16} />
                {t(`landing.free.${k}`)}
              </li>
            ))}
          </ul>
          <Link href={native ? '/about' : '/support'} className="lp-free-link">
            {native ? t('home.freeLinkApp') : t('home.freeLink')} →
          </Link>
        </div>
        <div className="lp-free-price" aria-hidden="true">
          <strong>{t('landing.free.price')}</strong>
          <span>{t('landing.free.priceNote')}</span>
        </div>
      </section>

      <section className="lp-closing" aria-labelledby="lp-closing-title">
        <div className="lp-closing-dogs" aria-hidden="true">
          {TRIO.map((dog, i) => (
            <span key={dog.tile} className={`n${i}`}>
              <DogTile dog={dog} />
            </span>
          ))}
          <span className="lp-closing-paw">
            <PawMark size={20} />
          </span>
        </div>
        <h2 id="lp-closing-title" className="lp-h2">
          {t('landing.closing.title')}
        </h2>
        <p className="lp-sub">{t('landing.closing.text')}</p>
        <div className="lp-ctas center">
          <Link href="/dogs" className="button primary lp-cta">
            {t('home.ctaDogs')}
            <Icon name="arrow" size={18} />
          </Link>
          <Link href={ownerHref} className="button secondary lp-cta">
            {t('home.ctaOwner')}
          </Link>
        </div>
      </section>
    </div>
  )
}
