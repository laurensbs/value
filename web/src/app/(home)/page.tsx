import Link from 'next/link'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { ImpactBand } from '@/components/impact/ImpactBand'
import { Chooser } from '@/components/landing/Chooser'
import { Community } from '@/components/landing/Community'
import { DogStage } from '@/components/landing/DogStage'
import { DogTile } from '@/components/landing/DogTile'
import { HelpUs } from '@/components/landing/HelpUs'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { LandingIcon, PawMark } from '@/components/landing/LandingIcon'
import { NewestDogs } from '@/components/landing/NewestDogs'
import { TRIO } from '@/components/landing/looks'
import { IconTile, type Tone } from '@/components/landing/PageHero'
import { PhoneShowcase } from '@/components/landing/PhoneShowcase'
import { JsonLd } from '@/components/JsonLd'
import { pageMetadata, siteGraph } from '@/lib/seo'
import { APP_NAME } from '@/lib/site'
import { supportConfig } from '@/lib/support'
import { liveLocationNow } from '@/server/live-location'
import { isNativeRequest } from '@/server/native'
import { newestRealDogs } from '@/server/newest-dogs'
import { Today } from '@/components/Today'
import { getViewer, type OnboardedViewer } from '@/server/session'
import '../landing.css'

const SAFETY: { key: 1 | 2 | 3 | 4 | 5 | 6; icon: ReactNode; tone: Tone }[] = [
  { key: 1, icon: <Icon name="users" />, tone: 'green' },
  { key: 2, icon: <LandingIcon name="idcard" />, tone: 'blue' },
  { key: 3, icon: <Icon name="shield" />, tone: 'warm' },
  { key: 4, icon: <Icon name="location" />, tone: 'green' },
  { key: 5, icon: <Icon name="chat" />, tone: 'blue' },
  { key: 6, icon: <Icon name="flag" />, tone: 'rose' },
]

export async function generateMetadata() {
  const [viewer, t] = await Promise.all([getViewer(), getTranslations()])
  const description = t('meta.description', { app: APP_NAME })
  // Members see Today here. Search engines and chat apps come without a session: they get the landing page.
  if (viewer?.profile) return pageMetadata({ path: '/', title: t('today.metaTitle'), description })
  return pageMetadata({ path: '/', title: t('meta.title', { app: APP_NAME }), absoluteTitle: true, description })
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const viewer = await getViewer()
  // Members get their own home: what to do today. Everyone else sees what Rondje is.
  if (viewer?.profile && !viewer.profile.bannedAt) {
    const { welcome } = await searchParams
    return <Today viewer={viewer as OnboardedViewer} welcome={welcome === '1'} />
  }
  const t = await getTranslations()
  // The newest real dogs, the same for everyone: Netherlands first (lib/newest-dogs.ts), never examples.
  const [native, dogs, live] = await Promise.all([isNativeRequest(), newestRealDogs(), liveLocationNow()])
  const ownerHref = viewer?.profile ? '/my-dogs/new' : '/signup?intent=owner'
  const bothHref = viewer?.profile ? '/my-dogs/new' : `/signup?next=${encodeURIComponent('/my-dogs/new')}`

  return (
    <div className="lp">
      <JsonLd data={siteGraph({ instagram: supportConfig().instagram })} />
      <section className="lp-hero">
        <div className="lp-hero-copy">
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

      {/* On the website the crowdfunding comes right after the hero; in the apps low on the page (below). */}
      {native ? null : <HelpUs native={false} />}

      <Chooser ownerHref={ownerHref} bothHref={bothHref} />

      <NewestDogs dogs={dogs} />

      <HowItWorks />

      {native ? null : <PhoneShowcase live={live} />}

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
                {/* Following a walk live only while live location is on (LIVE_LOCATION); otherwise what is true now. */}
                <h3>{t(`landing.safety.t${s.key}${s.key === 4 && !live ? 'Off' : ''}`)}</h3>
                <p>{t(`home.safety${s.key}${s.key === 4 && !live ? 'Off' : ''}`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ImpactBand native={native} />

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

      {native ? <HelpUs native /> : null}
    </div>
  )
}
