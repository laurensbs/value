import Link from 'next/link'
import { cookies } from 'next/headers'
import { getLocale, getTranslations } from 'next-intl/server'
import { DogCard } from '@/components/DogCard'
import { DogFace } from '@/components/DogFace'
import { DogsMap } from '@/components/DogsMap'
import { Icon } from '@/components/Icon'
import { FilterPill } from '@/components/discover/FilterPill'
import { GroupWalkRow } from '@/components/discover/GroupWalkRow'
import { TipCard } from '@/components/discover/HomeCards'
import { OrgHeader } from '@/components/discover/OrgHeader'
import { NextStepCard } from '@/components/NextStepCard'
import { Sym, type SymName } from '@/components/discover/Sym'
import { visitorCountry, visitorPosition } from '@/components/discover/visitor'
import { lookFor } from '@/lib/avatar'
import { COUNTRIES, countryInfo, isCountry, type Country } from '@/lib/countries'
import { pageMetadata } from '@/lib/seo'
import { formatDistance } from '@/lib/geo'
import { LATER_COOKIE } from '@/lib/next-step'
import { readableFirst } from '@/lib/story-language'
import { pageNow } from '@/server/clock'
import { rolesOf } from '@/server/progress'
import { listDogs, myGroupSignups, publicOrg, upcomingGroupWalks } from '@/server/queries'
import { getViewer, type OnboardedViewer } from '@/server/session'

type Search = { country?: string; host?: string; energy?: string; level?: string; q?: string; view?: string; org?: string; welcome?: string }

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getTranslations()
  const { org: orgId } = await searchParams
  const org = orgId ? await publicOrg(orgId.slice(0, 64)) : null
  // Filters (?q=, ?country=, ?view=) are views of one page: the canonical is /dogs. One shelter's dogs
  // (?org=) are a page of their own, the one a shelter shares and prints on its poster.
  if (org) {
    return pageMetadata({
      path: '/dogs',
      query: { org: org.id },
      title: t('dogs.orgTitle', { name: org.name }),
      description: org.description || t('dogs.lede'),
      // An example shelter is made up: never in search results.
      robots: org.isDemo ? 'noindex' : undefined,
    })
  }
  const viewer = await getViewer()
  return pageMetadata({ path: '/dogs', title: viewer?.profile ? t('shell.tabs.discover') : t('dogs.title'), description: t('dogs.lede') })
}

const FILTERS: { key: 'all' | 'calm' | 'high' | 'owner' | 'shelter'; icon: SymName }[] = [
  { key: 'all', icon: 'paw' },
  { key: 'calm', icon: 'leaf' },
  { key: 'high', icon: 'bolt' },
  { key: 'owner', icon: 'home' },
  { key: 'shelter', icon: 'building' },
]

/**
 * Ontdek, like the first tab of the iPhone app: search, Lijst | Kaart and the filters on top, then
 * straight away the dogs, starting in your own country and nearest first. The map is a screen of
 * its own that fills everything under the search bar. Your first steps, level and the town's
 * challenge live on /progress; Vandaag says the one thing to do next.
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
  // The plain view (no search, no shelter page) ends with the group walks and, for members, a tip.
  const plain = !orgId && !q

  const [found, org, groupWalks] = await Promise.all([
    // Without an account, dogs of private owners have no spot on the map (getDogDetail, DPIA maatregel M4).
    listDogs({ country: orgId ? undefined : country, near, host, energy, orgId, q, visitor: !member }),
    orgId ? publicOrg(orgId) : null,
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

  const roles = member ? rolesOf(member.profile) : null
  // At most one line above the dogs: the quiz comes before any request (like Guus in the app).
  const quizFirst = Boolean(member && roles?.walker && member.profile.wantsToWalk !== false && !member.profile.quizPassedAt && !orgId)
  const [renderedAt, jar] = quizFirst ? await Promise.all([pageNow(), cookies()]) : [new Date(), null]
  const title = org ? t('dogs.orgTitle', { name: org.name }) : t('dogs.title')
  // On the map, its card says what you need to know about a dog: no portrait or story to read yet.
  const mapCards = mapView
    ? Object.fromEntries(
        items.map(({ dog, distanceM }) => [
          dog.id,
          {
            dog: { id: dog.id, name: dog.name, photos: dog.photos, avatar: dog.avatar },
            breed: [dog.breed, dog.ageYears != null ? t('dogs.years', { n: dog.ageYears }) : null].filter(Boolean).join(' · '),
            where: own && distanceM != null && !dog.isDemo ? formatDistance(distanceM, locale) : dog.city,
            energy: t(`dogs.energy.${dog.energy}`),
            minutes: t('common.minutes', { n: dog.walkMinutes }),
            tag: dog.isDemo ? t('common.example') : null,
          },
        ]),
      )
    : {}

  return (
    <div className={`discover${mapView ? ' map-mode' : ''}`}>
      {/* Members and the map go straight to the dogs; a visitor's list starts with what this is. */}
      {member || mapView ? (
        <h1 className="visually-hidden">{title}</h1>
      ) : (
        <header className="discover-head">
          <h1>{title}</h1>
          <p className="lede">{t('dogs.lede')}</p>
        </header>
      )}

      {org && !mapView ? (
        <OrgHeader
          org={org}
          walks={orgWalks}
          joined={joined}
          signedIn={Boolean(viewer?.profile)}
          needsQuiz={Boolean(viewer?.profile && !viewer.profile.quizPassedAt && !myOrgs.has(org.id))}
        />
      ) : null}

      <section id="honden" className="discover-list">
        <div className="discover-bar">
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
          <nav className="segmented view-switch" aria-label={t('dogs.viewLabel')}>
            <Link href={query({ view: undefined })} replace aria-current={mapView ? undefined : 'page'}>
              <Sym name="list" size={18} />
              <span className="view-label">{t('dogs.showList')}</span>
            </Link>
            <Link href={query({ view: 'map' })} replace aria-current={mapView ? 'page' : undefined}>
              <Sym name="map" size={18} />
              <span className="view-label">{t('dogs.showMap')}</span>
            </Link>
          </nav>
          {/* The filters and, after them, the countries: one row that scrolls sideways. */}
          <div className="pill-row">
            <nav className="filter-pills" aria-label={t('dogs.filters')}>
              {FILTERS.map((f) => (
                <FilterPill key={f.key} href={filterHref(f.key)} on={filterOn(f.key)}>
                  <Sym name={f.icon} size={18} />
                  {filterLabel(f.key)}
                </FilterPill>
              ))}
            </nav>
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
          </div>
        </div>

        {quizFirst && !mapView ? (
          <NextStepCard
            compact
            stored={jar?.get(LATER_COOKIE)?.value ?? '{}'}
            now={renderedAt.getTime()}
            label={t('nextStep.title')}
            laterLabel={t('nextStep.later')}
            steps={[
              {
                id: 'quiz',
                later: true,
                dismiss: false,
                text: t('nextStep.quiz.text'),
                detail: t('nextStep.quiz.detail'),
                button: { label: t('nextStep.quiz.button'), href: '/profile/quiz?next=%2Fdogs' },
              },
            ]}
          />
        ) : null}

        {items.length === 0 ? (
          // A dog, one honest sentence and what you can do about it (onderzoek §3.8, §5 #10). A filter or
          // search that finds nothing says so, instead of claiming there are no dogs at all.
          host || energy || q ? (
            <div className="empty-card dogs-empty stack-s">
              <DogFace look={lookFor({ id: 'empty-filter' })} size={88} />
              <p>{t('dogs.emptyFiltered')}</p>
              <div className="row">
                <Link href={query({ host: undefined, energy: undefined, q: undefined })} className="button primary">
                  {t('landing.dogs.all')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="empty-card dogs-empty stack-s">
              <DogFace look={lookFor({ id: 'empty-dogs' })} size={88} />
              <p>{t('dogs.empty')}</p>
              <div className="row">
                <Link href="/profile#invite" className="button primary">
                  {t('dogs.sendLink')}
                </Link>
                <Link href="/suggest?kind=shelter" className="button secondary">
                  {t('dogs.tipShelter')}
                </Link>
                <Link href="/shelters" className="button ghost">
                  {t('dogs.findShelter')}
                </Link>
              </div>
            </div>
          )
        ) : mapView ? (
          <DogsMap
            label={title}
            note={member ? t('dogs.mapNote') : t('dogs.mapNoteVisitor')}
            center={near}
            cards={mapCards}
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

      {member && plain && !mapView ? <TipCard owner={Boolean(roles?.owner && !roles.walker)} /> : null}
    </div>
  )
}
