import Link from 'next/link'
import { getFormatter, getTranslations } from 'next-intl/server'
import { DogPortrait } from '@/components/DogPortrait'
import { Icon } from '@/components/Icon'
import { Today } from '@/components/Today'
import { isNativeRequest } from '@/server/native'
import { IMPACT_MIN_WALKS, impactTotals, listDogs } from '@/server/queries'
import { getViewer, type OnboardedViewer } from '@/server/session'

export async function generateMetadata() {
  const viewer = await getViewer()
  if (!viewer?.profile) return {}
  const t = await getTranslations('today')
  return { title: t('metaTitle') }
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const viewer = await getViewer()
  // Members get their own home: what to do today. Everyone else sees what Rondje is.
  if (viewer?.profile && !viewer.profile.bannedAt) {
    const { welcome } = await searchParams
    return <Today viewer={viewer as OnboardedViewer} welcome={welcome === '1'} />
  }
  const [t, native, someDogs, impact, format] = await Promise.all([getTranslations('home'), isNativeRequest(), listDogs({}, 8), impactTotals(), getFormatter()])
  const dogs = someDogs.slice(0, 4)

  return (
    <div className="stack-l">
      <section className="hero">
        <div className="stack">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>{t.rich('title', { mark: (chunks) => <mark>{chunks}</mark> })}</h1>
          <p className="lede">{t('lede')}</p>
          <div className="row">
            <Link href="/dogs" className="button primary">
              {t('ctaDogs')}
              <Icon name="arrow" size={18} />
            </Link>
            <Link href={viewer?.profile ? '/my-dogs/new' : '/signup?intent=owner'} className="button secondary">
              {t('ctaOwner')}
            </Link>
            <Link href="/shelter" className="link-button">
              {t('ctaShelter')}
            </Link>
          </div>
        </div>
        <div className="hero-dogs" aria-label={t('exampleDogs')}>
          {dogs.map(({ dog }) => (
            <Link key={dog.id} href={`/dogs/${dog.id}`} aria-label={dog.name}>
              <DogPortrait dog={dog} large />
            </Link>
          ))}
        </div>
      </section>

      <section className="stack" aria-labelledby="how">
        <h2 id="how">{t('howTitle')}</h2>
        <ol className="steps">
          <li>{t('how1')}</li>
          <li>{t('how2')}</li>
          <li>{t('how3')}</li>
          <li>{t('how4')}</li>
        </ol>
      </section>

      <section className="audiences">
        <div className="card stack-s">
          <h2>{t('forWalkers')}</h2>
          <p className="muted">{t('forWalkersText')}</p>
          <Link href="/signup?intent=walker" className="link-button">
            {t('ctaDogs')}
          </Link>
        </div>
        <div className="card stack-s">
          <h2>{t('forOwners')}</h2>
          <p className="muted">{t('forOwnersText')}</p>
          <Link href={viewer?.profile ? '/my-dogs/new' : '/signup?intent=owner'} className="link-button">
            {t('ctaOwner')}
          </Link>
        </div>
        <div className="card stack-s">
          <h2>{t('forShelters')}</h2>
          <p className="muted">{t('forSheltersText')}</p>
          <Link href="/shelter" className="link-button">
            {t('ctaShelter')}
          </Link>
        </div>
      </section>

      <section className="card flat stack" aria-labelledby="safety">
        <h2 id="safety">{t('safetyTitle')}</h2>
        <ul className="list">
          {(['safety1', 'safety2', 'safety3', 'safety4', 'safety5', 'safety6'] as const).map((k) => (
            <li key={k} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <Icon name="shield" size={20} />
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
        <Link href="/safety" className="link-button">
          {t('safetyMore')}
        </Link>
      </section>

      {impact.walks >= IMPACT_MIN_WALKS ? (
        <section className="stack-s" aria-labelledby="impact-title">
          <h2 id="impact-title">{t('impactTitle')}</h2>
          <dl className="impact">
            <div>
              <dt>{t('impactWalks')}</dt>
              <dd>{format.number(impact.walks)}</dd>
            </div>
            <div>
              <dt>{t('impactKm')}</dt>
              <dd>{format.number(impact.km)}</dd>
            </div>
            <div>
              <dt>{t('impactDogs')}</dt>
              <dd>{format.number(impact.dogs)}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section className="grid-2">
        <div className="card stack-s">
          <h2>{t('countriesTitle')}</h2>
          <p className="muted">{t('countriesText')}</p>
          <p style={{ fontSize: '2rem' }} aria-hidden="true">
            🇳🇱 🇧🇪 🇪🇸
          </p>
        </div>
        <div className="card stack-s">
          <h2>{t('freeTitle')}</h2>
          <p className="muted">{t('freeText')}</p>
          <Link href={native ? '/about' : '/support'} className="link-button small">
            {native ? t('freeLinkApp') : t('freeLink')} →
          </Link>
        </div>
      </section>
    </div>
  )
}
