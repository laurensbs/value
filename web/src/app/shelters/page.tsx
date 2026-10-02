import { and, count, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Icon } from '@/components/Icon'
import { Map, type MapMarker } from '@/components/map'
import { VoteButton } from '@/components/SuggestForm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { COUNTRIES, COUNTRY_INFO, isCountry } from '@/lib/countries'
import { DIRECTORY } from '@/lib/directory'
import { guessCountry } from '@/lib/guess-country'
import { getViewer } from '@/server/session'

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
      // Only dogs people can actually meet: not paused, adopted, hidden or drafts.
      dogs: sql<number>`count(${s.dog.id}) filter (where ${s.dog.status} = 'active')`.mapWith(Number),
    })
    .from(s.organization)
    .leftJoin(s.dog, eq(s.dog.orgId, s.organization.id))
    .where(eq(s.organization.status, 'verified'))
    .groupBy(s.organization.id)
  const localPartners = partners.filter((p) => p.country === country)
  const claimed = new Set(partners.map((p) => p.directoryId).filter(Boolean))
  const others = DIRECTORY.filter((d) => d.country === country && !claimed.has(d.id)).sort((a, b) => (a.city ?? '').localeCompare(b.city ?? ''))

  // "I want to walk here": how many people asked for each shelter, and whether the viewer did.
  const viewer = await getViewer()
  const voteRows = await db
    .select({ directoryId: s.suggestion.directoryId, n: count() })
    .from(s.suggestion)
    .where(and(isNotNull(s.suggestion.directoryId), eq(s.suggestion.country, country), inArray(s.suggestion.status, ['new', 'contacted'])))
    .groupBy(s.suggestion.directoryId)
  const votes: Record<string, number> = Object.fromEntries(voteRows.map((r) => [r.directoryId ?? '', r.n]))
  const mine = viewer?.profile
    ? new Set(
        (
          await db
            .select({ directoryId: s.suggestion.directoryId })
            .from(s.suggestion)
            .where(and(eq(s.suggestion.suggestedBy, viewer.userId), isNotNull(s.suggestion.directoryId)))
        ).map((r) => r.directoryId),
      )
    : new Set<string | null>()
  const here = `/shelters?country=${country}`
  const loginHref = viewer?.profile ? null : viewer ? `/onboarding?next=${encodeURIComponent(here)}` : `/login?next=${encodeURIComponent(here)}`

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
              <div className="stack-s directory-actions">
                <VoteButton directoryId={d.id} votes={votes[d.id] ?? 0} voted={mine.has(d.id)} loginHref={loginHref} />
                <Link href={`/shelter?claim=${d.id}`} className="link-button small">
                  {t('directory.claimShort')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <p className="muted small">{t('directory.votesHint')}</p>
        <p className="small">
          <Link href="/shelter">{t('directory.claim')}</Link>
        </p>
      </section>

      <section className="card flat stack-s">
        <h2>{t('directory.tipTitle')}</h2>
        <p className="muted">{t('directory.tipText')}</p>
        <div>
          <Link href="/suggest?kind=shelter" className="button secondary">
            <Icon name="heart" size={16} /> {t('directory.tipButton')}
          </Link>
        </div>
      </section>
    </div>
  )
}
