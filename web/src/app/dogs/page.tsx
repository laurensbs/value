import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { DogCard } from '@/components/DogCard'
import { DogsMap } from '@/components/DogsMap'
import { Icon } from '@/components/Icon'
import { COUNTRIES, countryInfo, isCountry } from '@/lib/countries'
import { listDogs, publicOrg } from '@/server/queries'
import { getViewer } from '@/server/session'

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getTranslations('dogs')
  const { org: orgId } = await searchParams
  const org = orgId ? await publicOrg(orgId.slice(0, 64)) : null
  if (org) return { title: t('orgTitle', { name: org.name }), description: org.description.slice(0, 160) || t('lede') }
  return { title: t('title'), description: t('lede') }
}

type Search = { country?: string; host?: string; energy?: string; level?: string; q?: string; view?: string; org?: string }

export default async function DogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const t = await getTranslations()
  const viewer = await getViewer()
  const country = isCountry(sp.country) ? sp.country : sp.country === 'all' ? undefined : (viewer?.profile?.country ?? undefined)
  const near =
    viewer?.profile?.lat != null && viewer.profile.lng != null
      ? { lat: viewer.profile.lat, lng: viewer.profile.lng }
      : country
        ? countryInfo(country).center
        : null
  const host = sp.host === 'owner' || sp.host === 'shelter' ? sp.host : undefined
  const energy = ['calm', 'medium', 'high'].includes(sp.energy ?? '') ? sp.energy : undefined
  const orgId = sp.org?.slice(0, 64) || undefined
  const items = await listDogs({ country: orgId ? undefined : country, near, host, energy, orgId, q: sp.q?.slice(0, 60) })
  const org = orgId ? await publicOrg(orgId) : null
  const mapView = sp.view === 'map'

  const query = (patch: Partial<Search>) => {
    const next = new URLSearchParams()
    const merged = { country: country ?? 'all', host, energy, q: sp.q, view: sp.view, org: orgId, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v)
    return `/dogs?${next.toString()}`
  }

  return (
    <div className="stack">
      <header className="stack-s">
        <h1>{t('dogs.title')}</h1>
        <p className="lede">{t('dogs.lede')}</p>
      </header>

      {org ? (
        <section className="card stack-s org-header">
          {org.coverUrl ? (
            <div className="shelter-cover">
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL or data URL */}
              <img src={org.coverUrl} alt="" />
            </div>
          ) : null}
          <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL or data URL */}
            {org.logoUrl ? <img src={org.logoUrl} alt="" className="org-logo" /> : <Icon name="building" />}
            <div style={{ minWidth: 0 }}>
              <h2>{org.name}</h2>
              <p className="muted small">
                {org.city} · {t(`common.countries.${org.country}`)} · <Icon name="shield" size={13} /> {t('common.verified')}
              </p>
            </div>
          </div>
          {org.description ? <p className="small prose">{org.description}</p> : null}
          {org.walkingTimes ? (
            <p className="small">
              <strong>{t('dog.walkingTimes')}:</strong> {org.walkingTimes}
            </p>
          ) : null}
          {org.openingHours ? (
            <p className="small">
              <strong>{t('dogs.orgOpeningHours')}:</strong> {org.openingHours}
            </p>
          ) : null}
          <p className="small">
            <strong>{t('dog.treatsLabel')}:</strong> {t(`dogs.orgTreats.${org.treatsPolicy === 'yes' || org.treatsPolicy === 'no' ? org.treatsPolicy : 'own'}`)}
          </p>
          {org.website || org.instagram ? (
            <div className="row">
              {org.website ? (
                <a href={org.website} target="_blank" rel="noopener noreferrer" className="link-button small">
                  <Icon name="globe" size={15} /> {t('dog.website')}
                </a>
              ) : null}
              {org.instagram ? (
                <a href={`https://www.instagram.com/${org.instagram}/`} target="_blank" rel="noopener noreferrer" className="link-button small">
                  @{org.instagram}
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <form className="filters" action="/dogs" method="get">
        <input type="hidden" name="view" value={sp.view ?? ''} />
        {orgId ? <input type="hidden" name="org" value={orgId} /> : null}
        <label className="field grow">
          <span className="visually-hidden">{t('dogs.search')}</span>
          <input className="input" name="q" defaultValue={sp.q ?? ''} placeholder={t('dogs.search')} />
        </label>
        <label className="field">
          <span className="visually-hidden">{t('common.country')}</span>
          <select className="select" name="country" defaultValue={country ?? 'all'}>
            <option value="all">{t('common.all')}</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {countryInfo(c).flag} {t(`common.countries.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary" type="submit">
          {t('dogs.filters')}
        </button>
      </form>

      <div className="spread">
        <div className="choices" role="group" aria-label={t('dogs.filters')}>
          {(['all', 'owner', 'shelter'] as const).map((h) => (
            <Link key={h} href={query({ host: h === 'all' ? undefined : h })} className={`chip${(host ?? 'all') === h ? ' on' : ''}`}>
              {t(`dogs.host.${h}`)}
            </Link>
          ))}
          {(['calm', 'high'] as const).map((e) => (
            <Link key={e} href={query({ energy: energy === e ? undefined : e })} className={`chip${energy === e ? ' on' : ''}`}>
              {t(`dogs.energy.${e}`)}
            </Link>
          ))}
        </div>
        <Link href={query({ view: mapView ? undefined : 'map' })} className="button ghost small">
          <Icon name={mapView ? 'list' : 'map'} size={16} />
          {mapView ? t('dogs.showList') : t('dogs.showMap')}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card stack-s">
          <p>{t('dogs.empty')}</p>
          <div className="row">
            <Link href="/shelters" className="button secondary small">
              {t('dogs.findShelter')}
            </Link>
            <Link href="/profile#invite" className="button ghost small">
              {t('dogs.inviteOwner')}
            </Link>
            <Link href="/suggest?kind=shelter" className="button ghost small">
              {t('dogs.tipShelter')}
            </Link>
          </div>
        </div>
      ) : mapView ? (
        <DogsMap
          label={t('dogs.title')}
          center={near ?? countryInfo(country).center}
          markers={items
            .filter((i) => i.dog.lat != null && i.dog.lng != null)
            .map((i) => ({
              id: i.dog.id,
              lat: i.dog.lat!,
              lng: i.dog.lng!,
              label: `${i.dog.name} · ${i.dog.city}`,
              href: `/dogs/${i.dog.id}`,
              kind: i.host.kind === 'shelter' ? ('shelter' as const) : ('dog' as const),
            }))}
        />
      ) : (
        <ul className="dog-grid">
          {items.map((item) => (
            <li key={item.dog.id}>
              <DogCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
