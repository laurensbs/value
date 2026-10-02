import { count, eq } from 'drizzle-orm'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { Map, type MapMarker } from '@/components/map'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { COUNTRIES, COUNTRY_INFO, isCountry } from '@/lib/countries'
import { DIRECTORY } from '@/lib/directory'
import { guessCountry } from '@/lib/guess-country'

export async function generateMetadata() {
  const t = await getTranslations('directory')
  return { title: t('title'), description: t('lede') }
}

export default async function SheltersPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const sp = await searchParams
  const country = isCountry(sp.country) ? sp.country : await guessCountry()
  const t = await getTranslations()
  const db = await getDb()
  const partners = await db
    .select({
      id: s.organization.id,
      name: s.organization.name,
      city: s.organization.city,
      country: s.organization.country,
      lat: s.organization.lat,
      lng: s.organization.lng,
      directoryId: s.organization.directoryId,
      isDemo: s.organization.isDemo,
      dogs: count(s.dog.id),
    })
    .from(s.organization)
    .leftJoin(s.dog, eq(s.dog.orgId, s.organization.id))
    .where(eq(s.organization.status, 'verified'))
    .groupBy(s.organization.id)
  const localPartners = partners.filter((p) => p.country === country)
  const claimed = new Set(partners.map((p) => p.directoryId).filter(Boolean))
  const others = DIRECTORY.filter((d) => d.country === country && !claimed.has(d.id)).sort((a, b) => (a.city ?? '').localeCompare(b.city ?? ''))

  const markers: MapMarker[] = [
    ...localPartners.filter((p) => p.lat != null && p.lng != null).map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, label: p.name, href: `/dogs?org=${p.id}`, kind: 'shelter' as const })),
    ...others.filter((d) => d.lat != null && d.lng != null).map((d) => ({ id: d.id, lat: d.lat!, lng: d.lng!, label: `${d.name} · ${d.city ?? ''}`, href: d.website ?? undefined, kind: 'pin' as const })),
  ]

  return (
    <div className="stack-l">
      <header className="stack-s">
        <h1>{t('directory.title')}</h1>
        <p className="lede">{t('directory.lede')}</p>
      </header>
      <nav className="choices" aria-label={t('common.country')}>
        {COUNTRIES.map((c) => (
          <Link key={c} href={`/shelters?country=${c}`} className={`chip${c === country ? ' on' : ''}`}>
            {COUNTRY_INFO[c].flag} {t(`common.countries.${c}`)}
          </Link>
        ))}
      </nav>
      {markers.length ? <Map center={COUNTRY_INFO[country].center} zoom={7} markers={markers} fitToMarkers className="map" ariaLabel={t('directory.title')} /> : null}

      <section className="stack-s">
        <h2>{t('directory.partner')}</h2>
        {localPartners.length ? (
          <ul className="list">
            {localPartners.map((p) => (
              <li key={p.id} className="list-item">
                <Icon name="building" />
                <div className="grow">
                  <div className="row">
                    <strong>{p.name}</strong>
                    <span className="pill green">
                      <Icon name="shield" size={13} /> {t('common.verified')}
                    </span>
                    {p.isDemo ? <span className="pill ball">{t('common.example')}</span> : null}
                  </div>
                  <p className="muted small">
                    {p.city} · {t('directory.dogs', { n: p.dogs })}
                  </p>
                </div>
                <Link href={`/dogs?org=${p.id}`} className="button secondary small">
                  {t('directory.seeDogs')}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('directory.noPartners')}</p>
        )}
      </section>

      <section className="stack-s">
        <h2>{t('directory.notPartner')}</h2>
        <p className="muted small">{t('directory.unverified')}</p>
        <ul className="list">
          {others.map((d) => (
            <li key={d.id} className="list-item">
              <div className="grow stack-s">
                <strong>{d.name}</strong>
                <p className="muted small">{[d.city, d.region].filter(Boolean).join(' · ')}</p>
                <div className="row">
                  {d.walkingProgram === 'yes' ? <span className="pill blue">{t('directory.walking')}</span> : null}
                  {d.website ? (
                    <a href={d.website} target="_blank" rel="noopener noreferrer" className="link-button small">
                      {t('directory.website')} ↗
                    </a>
                  ) : null}
                </div>
              </div>
              <Link href={`/shelter?claim=${d.id}`} className="button ghost small">
                {t('directory.claimShort')}
              </Link>
            </li>
          ))}
        </ul>
        <p className="small">
          <Link href="/shelter">{t('directory.claim')}</Link>
        </p>
      </section>
    </div>
  )
}
