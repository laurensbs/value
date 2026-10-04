import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { ShelterForm } from '@/components/ShelterTools'
import { directoryEntry } from '@/lib/directory'
import { getViewer } from '@/server/session'
import { pageMetadata } from '@/lib/seo'

export async function generateMetadata() {
  const t = await getTranslations('shelter')
  // ?claim=<directory id> pre-fills the form; search engines get the one page without it.
  return pageMetadata({ path: '/shelter', title: t('title'), description: t('lede') })
}

export default async function ShelterLandingPage({ searchParams }: { searchParams: Promise<{ claim?: string }> }) {
  const { claim } = await searchParams
  const viewer = await getViewer()
  const t = await getTranslations()
  const entry = directoryEntry(claim)
  const next = `/shelter${claim ? `?claim=${encodeURIComponent(claim)}` : ''}`

  return (
    <div className="stack-l">
      <header className="stack-s shelter-hero">
        <p className="eyebrow">{t('shelter.eyebrow')}</p>
        <h1>{t('shelter.title')}</h1>
        <p className="lede">{t('shelter.lede')}</p>
      </header>

      {viewer?.orgs.length ? (
        <section className="stack-s">
          <h2>{t('shelter.yours')}</h2>
          <ul className="list">
            {viewer.orgs.map((o) => (
              <li key={o.id} className="list-item">
                <Icon name="building" />
                <div className="grow">
                  <strong>{o.name}</strong>
                  <p className="muted small">{t(`shelter.status.${o.status}`)}</p>
                </div>
                <Link href={`/shelter/${o.id}`} className="button secondary small">
                  {t('shelter.open')}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="benefits">
        <li className="card">
          <Icon name="upload" />
          <h2>{t('shelter.benefit1Title')}</h2>
          <p className="muted small">{t('shelter.benefit1')}</p>
        </li>
        <li className="card">
          <Icon name="users" />
          <h2>{t('shelter.benefit2Title')}</h2>
          <p className="muted small">{t('shelter.benefit2')}</p>
        </li>
        <li className="card">
          <Icon name="shield" />
          <h2>{t('shelter.benefit3Title')}</h2>
          <p className="muted small">{t('shelter.benefit3')}</p>
        </li>
        <li className="card">
          <Icon name="heart" />
          <h2>{t('shelter.benefit4Title')}</h2>
          <p className="muted small">{t('shelter.benefit4')}</p>
        </li>
      </ul>

      <section className="stack" id="aanmelden">
        <div className="stack-s">
          <h2>{t('shelter.create')}</h2>
          <p className="muted">{t('shelter.createLede')}</p>
        </div>
        {!viewer ? (
          <div className="card flat stack-s">
            <p>{t('shelter.loginFirst')}</p>
            <div className="row">
              <Link href={`/signup?intent=shelter&next=${encodeURIComponent(next)}`} className="button primary">
                {t('nav.signup')}
              </Link>
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="button ghost">
                {t('nav.login')}
              </Link>
            </div>
          </div>
        ) : !viewer.profile ? (
          <div className="card flat">
            <Link href={`/onboarding?next=${encodeURIComponent(next)}&intent=shelter`} className="button primary">
              {t('shelter.finishProfile')}
            </Link>
          </div>
        ) : (
          <ShelterForm
            email={viewer.email}
            prefill={
              entry
                ? { directoryId: entry.id, name: entry.name, country: entry.country, city: entry.city ?? '', website: entry.website ?? '', lat: entry.lat, lng: entry.lng }
                : { country: (viewer.profile.country as 'NL') ?? 'NL' }
            }
          />
        )}
      </section>
    </div>
  )
}
