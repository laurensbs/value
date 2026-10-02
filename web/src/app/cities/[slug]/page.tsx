import { and, count, eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { citySlug } from '@/lib/cities'
import { COUNTRY_INFO } from '@/lib/countries'
import { DIRECTORY } from '@/lib/directory'
import { siteUrl } from '@/lib/site'
import { publicCities } from '@/server/cities'
import { isNativeRequest } from '@/server/native'
import { upcomingGroupWalks } from '@/server/queries'

type Props = { params: Promise<{ slug: string }> }

async function findCity(slug: string) {
  return (await publicCities()).find((c) => c.slug === slug)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await findCity((await params).slug)
  if (!city) return {}
  const t = await getTranslations('cities')
  return {
    title: t('metaTitle', { city: city.name }),
    description: t('metaDescription', { city: city.name }),
    alternates: { canonical: `${siteUrl()}/cities/${city.slug}` },
  }
}

/** A public page per city for search engines: shelters, group walks and how many dogs wait, never private dogs. */
export default async function CityPage({ params }: Props) {
  const { slug } = await params
  const city = await findCity(slug)
  if (!city) notFound()
  const t = await getTranslations()
  const format = await getFormatter()
  const native = await isNativeRequest()
  const db = await getDb()

  const orgRows = await db
    .select({ id: s.organization.id, name: s.organization.name, city: s.organization.city, directoryId: s.organization.directoryId })
    .from(s.organization)
    .where(and(eq(s.organization.status, 'verified'), eq(s.organization.country, city.country), eq(s.organization.isDemo, false)))
  const partners = orgRows.filter((o) => citySlug(o.city) === slug)
  const dogsByOrg = new Map<string, number>()
  // Only a count per city: which private dogs live where stays out of search engines.
  const dogRows = await db
    .select({ city: s.dog.city, orgId: s.dog.orgId, n: count() })
    .from(s.dog)
    .where(and(eq(s.dog.status, 'active'), eq(s.dog.country, city.country), eq(s.dog.isDemo, false)))
    .groupBy(s.dog.city, s.dog.orgId)
  let dogsHere = 0
  for (const r of dogRows) {
    if (r.orgId) dogsByOrg.set(r.orgId, (dogsByOrg.get(r.orgId) ?? 0) + r.n)
    if (citySlug(r.city) === slug) dogsHere += r.n
  }
  const claimed = new Set(partners.map((p) => p.directoryId).filter(Boolean))
  const others = DIRECTORY.filter((d) => d.city && citySlug(d.city) === slug && !claimed.has(d.id))
  const walks = (await upcomingGroupWalks({ country: city.country })).filter((w) => !w.isDemo && citySlug(w.city) === slug).slice(0, 6)
  const nearby = (await publicCities()).filter((c) => c.country === city.country && c.slug !== slug).slice(0, 12)

  return (
    <div className="stack-l">
      <nav aria-label={t('cities.all')}>
        <Link href="/cities" className="link-button">
          ← {t('cities.all')}
        </Link>
      </nav>
      <header className="stack-s">
        <p className="eyebrow">
          {COUNTRY_INFO[city.country].flag} {t(`common.countries.${city.country}`)}
        </p>
        <h1>{t('cities.metaTitle', { city: city.name })}</h1>
        <p className="lede">{t('cities.cityLede', { city: city.name })}</p>
      </header>

      <section className="card stack-s">
        <p className="big-number-line">
          <Icon name="paw" /> {t('cities.dogsWaiting', { n: dogsHere, city: city.name })}
        </p>
        <div className="row">
          <Link href={`/dogs?q=${encodeURIComponent(city.name)}`} className="button primary">
            {t('cities.seeDogs', { city: city.name })} <Icon name="arrow" size={16} />
          </Link>
          <Link href="/my-dogs/new" className="button secondary">
            {t('cities.addDog')}
          </Link>
        </div>
      </section>

      <section className="stack-s">
        <h2>{t('cities.sheltersTitle', { city: city.name })}</h2>
        {partners.length + others.length === 0 ? (
          <p className="muted">{t('cities.noShelters', { city: city.name })}</p>
        ) : (
          <ul className="list">
            {partners.map((p) => (
              <li key={p.id} className="list-item">
                <Icon name="building" />
                <div className="grow">
                  <div className="row">
                    <strong>{p.name}</strong>
                    <span className="pill green">
                      <Icon name="shield" size={13} /> {t('cities.onRondje')}
                    </span>
                  </div>
                  <p className="muted small">{t('cities.dogCount', { n: dogsByOrg.get(p.id) ?? 0 })}</p>
                </div>
                <Link href={`/dogs?org=${p.id}`} className="button secondary small">
                  {t('directory.seeDogs')}
                </Link>
              </li>
            ))}
            {others.map((d) => (
              <li key={d.id} className="list-item">
                <Icon name="building" />
                <div className="grow">
                  <strong>{d.name}</strong>
                  <p className="muted small">{t('cities.notYet')}</p>
                </div>
                {d.website ? (
                  <a href={d.website} target="_blank" rel="noopener noreferrer" className="link-button small">
                    {t('directory.website')} ↗
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">
          {others.length ? t('cities.voteHint') : null}{' '}
          <Link href={others.length ? `/shelters?country=${city.country}` : '/suggest?kind=shelter'}>{others.length ? t('cities.toDirectory') : t('cities.tipShelter')}</Link>
        </p>
      </section>

      <section className="stack-s">
        <h2>{t('cities.walksTitle', { city: city.name })}</h2>
        {walks.length ? (
          <ul className="list">
            {walks.map((w) => (
              <li key={w.id} className="list-item">
                <div className="time-badge" aria-hidden="true">
                  {format.dateTime(w.startsAt, { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="grow">
                  <strong>{w.orgName}</strong>
                  <p className="muted small">
                    {format.dateTime(w.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })} · {t('groupWalks.spots', { left: Math.max(0, w.capacity - w.booked) })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t('cities.noWalks', { city: city.name })}</p>
        )}
        <p className="small">
          <Link href={`/group-walks?country=${city.country}`}>{t('cities.allWalks')}</Link>
        </p>
      </section>

      <section className="stack-s">
        <h2>{t('home.howTitle')}</h2>
        <ol className="steps">
          <li>{t('home.how1')}</li>
          <li>{t('home.how2')}</li>
          <li>{t('home.how3')}</li>
          <li>{t('home.how4')}</li>
        </ol>
        <p className="small">
          <Link href="/safety">{t('home.safetyMore')}</Link>
        </p>
      </section>

      <section className="card flat stack-s">
        <h2>{t('cities.freeTitle')}</h2>
        <p>{t('cities.freeText')}</p>
        {native ? null : (
          <p className="small">
            <Link href="/support">{t('cities.howFree')}</Link>
          </p>
        )}
      </section>

      {nearby.length ? (
        <nav className="stack-s" aria-label={t('cities.otherCities')}>
          <h2>{t('cities.otherCities')}</h2>
          <div className="choices">
            {nearby.map((c) => (
              <Link key={c.slug} href={`/cities/${c.slug}`} className="chip">
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  )
}
