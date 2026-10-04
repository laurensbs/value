import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { DogCard } from '@/components/DogCard'
import { DogsMap } from '@/components/DogsMap'
import { Icon } from '@/components/Icon'
import { FilterPill } from '@/components/discover/FilterPill'
import { GroupWalkRow } from '@/components/discover/GroupWalkRow'
import { ChallengeCard, FirstSteps, Greeting, LevelCard, TipCard, WelcomeCard } from '@/components/discover/HomeCards'
import { OrgHeader } from '@/components/discover/OrgHeader'
import { Sym, type SymName } from '@/components/discover/Sym'
import { visitorCountry, visitorPosition } from '@/components/discover/visitor'
import { COUNTRIES, countryInfo, isCountry, type Country } from '@/lib/countries'
import { readableFirst } from '@/lib/story-language'
import { challengesFor } from '@/server/challenges'
import { progressFor } from '@/server/progress'
import { challengesJson, progressJson } from '@/server/progress-json'
import { listDogs, myGroupSignups, publicOrg, upcomingGroupWalks } from '@/server/queries'
import { getViewer, type OnboardedViewer } from '@/server/session'

type Search = { country?: string; host?: string; energy?: string; level?: string; q?: string; view?: string; org?: string; welcome?: string }

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getTranslations()
  const { org: orgId } = await searchParams
  const org = orgId ? await publicOrg(orgId.slice(0, 64)) : null
  if (org) return { title: t('dogs.orgTitle', { name: org.name }), description: org.description.slice(0, 160) || t('dogs.lede') }
  const viewer = await getViewer()
  return { title: viewer?.profile ? t('shell.tabs.discover') : t('dogs.title'), description: t('dogs.lede') }
}

const FILTERS: { key: 'all' | 'calm' | 'high' | 'owner' | 'shelter'; icon: SymName }[] = [
  { key: 'all', icon: 'paw' },
  { key: 'calm', icon: 'leaf' },
  { key: 'high', icon: 'bolt' },
  { key: 'owner', icon: 'home' },
  { key: 'shelter', icon: 'building' },
]

/**
 * Ontdek: for people with a profile this is home, like the first tab of the iPhone app (greeting,
 * first steps, level, the month's challenge, a tip, then the dogs). Visitors get the same list of
 * dogs, starting in their own country and nearest first.
 */
export default async function DogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const t = await getTranslations()
  const locale = await getLocale()
  const viewer = await getViewer()
  const member = viewer?.profile && !viewer.profile.bannedAt ? (viewer as OnboardedViewer) : null

  // Which country first: the one in your profile, else where the visitor seems to be. "all" shows every country.
  const home: Country = member && isCountry(member.profile.country) ? member.profile.country : await visitorCountry()
  const country = isCountry(sp.country) ? sp.country : sp.country === 'all' ? undefined : home
  const countryParam = isCountry(sp.country) || sp.country === 'all' ? sp.country : undefined
  // Nearest first: your own (rounded) location, else a rough one from the IP lookup, else the middle of the country.
  // Only your own location is good enough to print a distance on the cards.
  const own = member?.profile.lat != null && member.profile.lng != null ? { lat: member.profile.lat, lng: member.profile.lng } : null
  // With every country shown, the home country still decides what is near.
  const near = own ?? (await visitorPosition(country ?? home)) ?? countryInfo(country ?? home).center

  const host = sp.host === 'owner' || sp.host === 'shelter' ? sp.host : undefined
  const energy = sp.energy === 'calm' || sp.energy === 'medium' || sp.energy === 'high' ? sp.energy : undefined
  const orgId = sp.org?.slice(0, 64) || undefined
  const q = sp.q?.trim().slice(0, 60) || undefined
  const mapView = sp.view === 'map'
  // The plain Ontdek view (no search, no shelter page) gets the greeting and the cards on top.
  const plain = !orgId && !q

  const [found, org, progress, challenges, groupWalks] = await Promise.all([
    listDogs({ country: orgId ? undefined : country, near, host, energy, orgId, q }),
    orgId ? publicOrg(orgId) : null,
    member && plain ? progressFor(member).then(progressJson) : null,
    member && plain ? challengesFor(member).then(challengesJson) : null,
    plain && !mapView ? upcomingGroupWalks({ country }) : [],
  ])
  const orgWalks = org ? await upcomingGroupWalks({ orgId: org.id }) : []
  const joined = org && viewer ? await myGroupSignups(viewer.userId) : new Set<string>()

  // Your own dogs are not in your list of dogs to walk (like in the app), except on a shelter's own page.
  const myOrgs = new Set(viewer?.orgs.map((o) => o.id) ?? [])
  const mine = (i: (typeof found)[number]) => Boolean(member && (i.dog.ownerId === member.userId || (i.dog.orgId && myOrgs.has(i.dog.orgId))))
  // Stories in another language than the page go after the rest, so they never lead the list.
  const items = readableFirst(orgId ? found : found.filter((i) => !mine(i)), (i) => i.dog.story, locale)

  const query = (patch: Partial<Search>) => {
    const next = new URLSearchParams()
    const merged: Partial<Search> = { country: countryParam, host, energy, q, view: sp.view, org: orgId, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v)
    const qs = next.toString()
    return qs ? `/dogs?${qs}` : '/dogs'
  }
  const filterOn = (key: (typeof FILTERS)[number]['key']) => (key === 'all' ? !host && !energy : key === host || key === energy)
  const filterHref = (key: (typeof FILTERS)[number]['key']) =>
    query({ host: key === 'owner' || key === 'shelter' ? key : undefined, energy: key === 'calm' || key === 'high' ? key : undefined })
  const filterLabel = (key: (typeof FILTERS)[number]['key']) =>
    key === 'all' ? t('dogs.host.all') : key === 'owner' || key === 'shelter' ? t(`discover.filters.${key}`) : t(`dogs.energy.${key}`)

  const roles = progress?.roles
  const showLevel = progress && (progress.points > 0 || progress.steps.every((s) => s.done))

  return (
    <div className="discover">
      {member && plain ? (
        <>
          <Greeting name={member.profile.firstName} />
          <div className="home-cards">
            {sp.welcome && progress ? <WelcomeCard name={member.profile.firstName} progress={progress} /> : null}
            {progress ? <FirstSteps steps={progress.steps} /> : null}
            {showLevel ? <LevelCard progress={progress} /> : null}
            {challenges ? <ChallengeCard challenges={challenges} /> : null}
            <TipCard owner={Boolean(roles?.owner && !roles.walker)} />
          </div>
        </>
      ) : (
        <header className="discover-head">
          <h1>{org ? t('dogs.orgTitle', { name: org.name }) : t('dogs.title')}</h1>
          <p className="lede">{t('dogs.lede')}</p>
        </header>
      )}

      {org ? <OrgHeader org={org} walks={orgWalks} joined={joined} signedIn={Boolean(viewer?.profile)} /> : null}

      <section id="honden" className="discover-list" aria-labelledby={member && plain ? 'dogs-title' : undefined}>
        {member && plain ? (
          <h2 id="dogs-title" className="visually-hidden">
            {t('today.nearTitle')}
          </h2>
        ) : null}
        <div className="discover-tools">
          {/* One text field: Enter (or the keyboard's search key) sends the form. */}
          <form className="searchbar" action="/dogs" method="get" role="search">
            {countryParam ? <input type="hidden" name="country" value={countryParam} /> : null}
            {sp.view ? <input type="hidden" name="view" value={sp.view} /> : null}
            {orgId ? <input type="hidden" name="org" value={orgId} /> : null}
            <Sym name="search" size={20} />
            <label className="grow">
              <span className="visually-hidden">{t('dogs.search')}</span>
              <input name="q" type="search" defaultValue={q ?? ''} placeholder={t('dogs.search')} enterKeyHint="search" />
            </label>
          </form>
          <Link href={query({ view: mapView ? undefined : 'map' })} className="round-button" aria-label={mapView ? t('dogs.showList') : t('dogs.showMap')} title={mapView ? t('dogs.showList') : t('dogs.showMap')}>
            <Sym name={mapView ? 'list' : 'map'} size={22} />
          </Link>
        </div>

        {orgId ? null : (
          <nav className="country-pills" aria-label={t('common.country')}>
            {COUNTRIES.map((c) => (
              <FilterPill key={c} href={query({ country: c })} on={country === c} className="small">
                <span aria-hidden="true">{countryInfo(c).flag}</span>
                {t(`common.countries.${c}`)}
              </FilterPill>
            ))}
            <FilterPill href={query({ country: 'all' })} on={!country} className="small">
              <Icon name="globe" size={15} />
              {t('discover.allCountries')}
            </FilterPill>
          </nav>
        )}

        <nav className="filter-pills" aria-label={t('dogs.filters')}>
          {FILTERS.map((f) => (
            <FilterPill key={f.key} href={filterHref(f.key)} on={filterOn(f.key)}>
              <Sym name={f.icon} size={18} />
              {filterLabel(f.key)}
            </FilterPill>
          ))}
        </nav>

        {items.length === 0 ? (
          <div className="empty-card stack-s">
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
            center={near}
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
          <ul className="dog-cards">
            {items.map((item) => (
              <li key={item.dog.id}>
                <DogCard item={item} showDistance={Boolean(own)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <GroupWalkRow walks={groupWalks} />
    </div>
  )
}
