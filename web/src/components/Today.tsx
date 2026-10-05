import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { countryInfo, isCountry } from '@/lib/countries'
import { formatDistance } from '@/lib/geo'
import { shownCount } from '@/lib/nearby'
import { LATER_COOKIE, nextSteps, parseLater, pickStep, type NextStep, type NextStepAppointment } from '@/lib/next-step'
import { isNewDog } from '@/lib/nudges'
import { localParts, weekOf } from '@/lib/progress'
import { APP_NAME } from '@/lib/site'
import { TIME_ZONE, zonedToUtc } from '@/lib/time'
import { pageNow } from '@/server/clock'
import { liveLocationNow } from '@/server/live-location'
import { progressFor, rolesOf } from '@/server/progress'
import { levelMoment, progressJson } from '@/server/progress-json'
import { incomingRequests, listDogs, myDogs, outgoingRequests, trustGrantsFor, upcomingGroupWalks, walkersNear, type RequestRow } from '@/server/queries'
import type { OnboardedViewer } from '@/server/session'
import { DogPortrait } from './DogPortrait'
import { Icon } from './Icon'
import { NextStepCard, type CardStep } from './NextStepCard'
import { LevelUp } from './progress/LevelUp'

const WALKER_TIPS = 10
const OWNER_TIPS = 8
/** A dog this close is "in de buurt" for the one thing to do now. */
const NEAR_STEP_M = 15_000

const sameTown = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'night'
}

/** Day of the year in local time, 1 on 1 January (the iPhone app picks its tip the same way). */
function dayOfYear(now: Date): number {
  const p = localParts(now)
  return Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(p.year, 0, 0)) / 86_400_000)
}

/** "Vandaag 18:00", "Morgen 18:00" or "Zaterdag 10 oktober om 18:00", to start a sentence with. */
function whenText(at: Date, now: Date, locale: string): string {
  const day = (d: Date) => {
    const p = localParts(d)
    return Date.UTC(p.year, p.month - 1, p.day) / 86_400_000
  }
  const diff = day(at) - day(now)
  const text =
    diff === 0 || diff === 1
      ? `${new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(diff, 'day')} ${new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(at)}`
      : new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(at)
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1)
}

/**
 * Vandaag: one card with the one thing to do next (lib/next-step.ts), and under it your dogs and
 * the dogs near you. Everything else has its own place: your first steps, the week, the town's
 * challenge and the penningen on /progress; the push and home-screen questions on /requests.
 */
export async function Today({ viewer, welcome }: { viewer: OnboardedViewer; welcome: boolean }) {
  const now = await pageNow()
  const p = viewer.profile
  const hasOrg = viewer.orgs.length > 0
  const roles = rolesOf(p)
  const { owner } = roles
  // Shelter staff did not choose to walk (rolesOf still counts them as walkers): no dogs to ask for here.
  const staffOrg = hasOrg && !p.wantsToWalk && !owner ? viewer.orgs[0] : null
  const walker = roles.walker && !staffOrg
  const country = isCountry(p.country) ? p.country : undefined
  const own = p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null
  const near = own ?? (country ? countryInfo(country).center : null)

  // The first screen after opening the app: everything is asked at the same time.
  const [t, tp, td, tn, tc, format, locale, progress, outgoing, incoming, dogs, nearby, dogStats, walkers, orgWalks, jar, liveLocation] = await Promise.all([
    getTranslations('today'),
    getTranslations('progress'),
    getTranslations('dogs'),
    getTranslations('nextStep'),
    getTranslations('common'),
    getFormatter(),
    getLocale(),
    progressFor(viewer, now),
    walker ? outgoingRequests(viewer.userId) : Promise.resolve([]),
    owner || hasOrg ? incomingRequests(viewer) : Promise.resolve([]),
    owner ? myDogs(viewer) : Promise.resolve([]),
    walker ? listDogs({ country, near }, 8) : Promise.resolve([]),
    owner ? dogWeekStats(viewer.userId, now) : new Map<string, { week: number; walkers: number }>(),
    owner ? walkersNear(p, viewer.userId) : 0,
    staffOrg ? upcomingGroupWalks({ orgId: staffOrg.id }) : Promise.resolve([]),
    cookies(),
    liveLocationNow(),
  ])
  // What was put away with "Later" or "Nee, nu niet", so the right step shows from the first paint.
  const stored = jar.get(LATER_COOKIE)?.value ?? '{}'
  const json = await progressJson(progress)

  // Two small questions on top of that: feedback already given, and trust already recorded.
  const endedWalks = [...outgoing, ...incoming].filter((r) => r.walkStatus === 'ended' && r.walkId).map((r) => r.walkId!)
  const [given, trust] = await Promise.all([feedbackGiven(viewer.userId, endedWalks), trustGrantsFor([...new Set(incoming.map((r) => r.dog.id))])])

  const ownDogs = dogs.filter((d) => !d.isDemo)
  const myOrgs = new Set(viewer.orgs.map((o) => o.id))
  const nearbyDogs = nearby.filter((item) => item.dog.ownerId !== viewer.userId && !(item.dog.orgId && myOrgs.has(item.dog.orgId))).slice(0, 6)
  // Owners see how many walkers live nearby; with only a few, a nudge to tell the neighbours instead.
  const walkersNearby = shownCount(walkers)
  const shareDog = ownDogs.find((d) => d.status === 'active' && !d.orgId) ?? null

  const appointment = (r: RequestRow): NextStepAppointment => ({
    id: r.request.id,
    dog: { id: r.dog.id, name: r.dog.name, isDemo: r.dog.isDemo },
    walkerId: r.walker.id,
    walkerName: r.walker.firstName,
    kind: r.request.kind,
    meetVia: r.request.meetVia,
    status: r.request.status,
    startsAt: r.request.startsAt,
    durationMin: r.request.durationMin,
    weekly: r.request.weekly,
    walkId: r.walkId,
    walkStatus: r.walkStatus,
    feedbackGiven: Boolean(r.walkId && given.has(r.walkId)),
  })
  const steps = nextSteps({
    now,
    userId: viewer.userId,
    walker: roles.walker,
    owner,
    wantsToWalk: p.wantsToWalk,
    staffOrg: staffOrg ? { id: staffOrg.id, name: staffOrg.name, nextGroupWalk: orgWalks[0]?.startsAt ?? null } : null,
    quizPassed: Boolean(p.quizPassedAt),
    ownDogs: ownDogs.map((d) => ({ id: d.id, name: d.name, status: d.status, orgId: d.orgId, isDemo: d.isDemo })),
    outgoing: outgoing.map(appointment),
    incoming: incoming.map(appointment),
    trust: Object.fromEntries(trust),
    liveLocation,
    // "In de buurt" for a step: within 15 km of your own location, or in your town when we only guess where you are.
    nearby: nearbyDogs
      .filter(({ dog, distanceM }) => (own ? distanceM != null && distanceM <= NEAR_STEP_M : sameTown(dog.city, p.city)))
      .map(({ dog, distanceM }) => ({ id: dog.id, name: dog.name, isDemo: dog.isDemo, distanceM: own ? distanceM : null, city: dog.city })),
  })

  const day = dayOfYear(now)
  const tip = !walker || (owner && day % 2 === 1) ? t(`tips.owner.${(day % OWNER_TIPS) + 1}`) : t(`tips.walker.${(day % WALKER_TIPS) + 1}`)
  const week = progress.weeklyGoal != null && progress.walksThisWeek > 0 ? tn('week', { done: progress.walksThisWeek, goal: progress.weeklyGoal }) : null
  const card = steps.map((step) => cardStep(step))

  function cardStep(step: NextStep): CardStep {
    const base = { id: step.id, later: step.later, dismiss: step.dismiss }
    const values = {
      dog: step.dog ?? '',
      walker: step.walker ?? '',
      count: step.count ?? 0,
      app: APP_NAME,
      org: step.org ?? '',
      via: step.via ?? 'walk',
      when: step.at ? whenText(step.at, now, locale) : '',
    }
    const button = (label: string) => (step.href ? { label, href: step.href } : undefined)
    switch (step.kind) {
      case 'liveOwn':
        // "Kijk live mee" only for a walk that shares location; otherwise the walk is simply there to see.
        return { ...base, text: tn('liveOwn.text', values), button: button(tn(step.live ? 'liveOwn.button' : 'liveOwn.buttonQuiet')) }
      case 'live':
        return { ...base, text: tn('live.text', values), button: button(tn('live.button')) }
      case 'quiz':
      case 'addDog':
      case 'waiting':
      case 'rebook':
      case 'share':
        return { ...base, text: tn(`${step.kind}.text`, values), detail: tn(`${step.kind}.detail`, values), button: button(tn(`${step.kind}.button`, values)) }
      case 'start':
        return { ...base, text: tn(step.meet ? 'start.meet' : 'start.walk', values), button: button(tn('start.button')) }
      case 'decide':
        return { ...base, text: tn('decide.text', values), detail: tn('decide.detail'), button: button(tn('decide.button', values)) }
      case 'debrief':
        return { ...base, text: tn('debrief.text', values), detail: tn('debrief.detail'), button: button(tn('debrief.button')), no: tn('debrief.no') }
      case 'feedback':
        return { ...base, text: tn(step.asOwner ? 'feedback.owner' : 'feedback.walker', values), detail: tn('feedback.detail', values), button: button(tn('feedback.button')) }
      case 'upcoming': {
        const key = `${step.meet ? 'meet' : 'walk'}${step.asOwner ? 'Owner' : ''}`
        return { ...base, eyebrow: tn('upcoming.eyebrow'), text: tn(`upcoming.${key}`, values), button: button(tn('upcoming.button')) }
      }
      case 'nearby':
        return {
          ...base,
          text: step.distanceM != null ? tn('nearby.text', { ...values, distance: formatDistance(step.distanceM, locale) }) : tn('nearby.textCity', { ...values, city: step.city ?? '' }),
          detail: tn('nearby.detail', values),
          button: button(tn('nearby.button', values)),
        }
      case 'emptyTown':
        return { ...base, title: tn('emptyTown.title'), text: tn('emptyTown.text'), button: button(tn('emptyTown.button')), secondary: { label: tn('emptyTown.tip'), href: '/suggest?kind=shelter' } }
      case 'ownerWaiting':
        return { ...base, text: tn('ownerWaiting.text', values), button: button(tn('ownerWaiting.button', values)) }
      case 'shelter':
        return step.at
          ? { ...base, text: tn('shelter.next', values), button: button(tn('shelter.button', values)) }
          : { ...base, text: tn('shelter.plan', values), button: button(tn('shelter.button', values)) }
      case 'night':
        return { ...base, text: tn('night.text'), detail: tip, button: button(tn('night.button')) }
      case 'done':
        return { ...base, text: tn('done.text'), detail: week ?? tip }
    }
  }

  // The step the card shows (the same choice as in the browser), for the tip line below.
  const shown = pickStep(card, parseLater(stored), now.getTime())
  const kindOf = (id: string | undefined) => steps.find((step) => step.id === id)?.kind
  const tipLine = owner && !roles.walker && !['done', 'night'].includes(kindOf(shown?.id) ?? '')
  const moment = levelMoment(progress, json)
  const hour = localParts(now).hour

  return (
    <div className="today">
      <header className="today-head">
        <div className="stack-s">
          <p className="eyebrow">{format.dateTime(now, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{t(greetingKey(hour), { name: p.firstName })}</h1>
        </div>
        <Link href="/progress" className="level-chip" aria-label={`${tp('levelN', { n: json.level.number })}, ${json.level.name}, ${tp('points', { n: json.points })}`}>
          <span className="level-badge" style={{ '--p': json.level.progress } as React.CSSProperties}>
            {json.level.number}
          </span>
          <span className="level-chip-text">
            <strong>{json.level.name}</strong>
            <span className="muted small">{tp('points', { n: json.points })}</span>
          </span>
        </Link>
      </header>

      <NextStepCard
        steps={card}
        stored={stored}
        now={now.getTime()}
        label={tn('title')}
        laterLabel={tn('later')}
        welcome={welcome ? t('welcomeTitle', { name: p.firstName }) : null}
        welcomeText={welcome ? t('welcomeText', { level: json.level.name }) : null}
      />

      {/* Your dogs. Without one yet, the card above says how (and the Mijn honden tab is there). */}
      {owner && ownDogs.length ? (
        <section className="stack" aria-labelledby="my-dogs-title">
          <div className="section-title">
            <h2 id="my-dogs-title">{t('myDogsTitle')}</h2>
            <Link href="/my-dogs/new" className="link-button small">
              <Icon name="plus" size={16} /> {t('addDog')}
            </Link>
          </div>
          {walkersNearby != null ? (
            <p className="walkers-near muted small">
              <Icon name="users" size={16} />
              {t('walkersNear', { n: walkersNearby })}
            </p>
          ) : shareDog ? (
            <p className="walkers-near muted small">
              <Icon name="users" size={16} />
              <span>
                {t.rich('walkersFew', { dog: shareDog.name, link: (chunks) => <Link href={`/dogs/${shareDog.id}#share`}>{chunks}</Link> })}
              </span>
            </p>
          ) : null}
          <ul className="mini-dogs">
            {ownDogs.map((dog) => (
              <li key={dog.id}>
                <Link href={`/dogs/${dog.id}`} className="mini-dog">
                  <DogPortrait dog={dog} size={64} decorative />
                  <span className="stack-s">
                    <strong>{dog.name}</strong>
                    <span className="muted small">{t('dogWeek', { n: dogStats.get(dog.id)?.week ?? 0 })}</span>
                    <span className="muted small">{t('dogFriends', { n: dogStats.get(dog.id)?.walkers ?? 0 })}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Owners have no Ontdek tab with its tip: one quiet line here (the card's end has it otherwise). */}
      {tipLine ? (
        <p className="today-tip">
          <Icon name="sparkle" size={16} />
          <span>
            <strong>{t('tipTitle')}:</strong> {tip}
          </span>
        </p>
      ) : null}

      {/* The dogs near you, straight under the card; the map is one tap away and fills the screen. */}
      {walker && nearbyDogs.length ? (
        <section className="stack today-near" aria-labelledby="near-title">
          <div className="section-title">
            <h2 id="near-title">{t('nearTitle')}</h2>
            <span className="today-links">
              <Link href="/dogs?view=map" className="link-button small">
                <Icon name="map" size={16} /> {td('showMap')}
              </Link>
              <Link href="/dogs" className="link-button small">
                {t('nearAll')}
              </Link>
            </span>
          </div>
          <ul className="dog-strip">
            {nearbyDogs.map(({ dog, distanceM }) => (
              <li key={dog.id}>
                <Link href={`/dogs/${dog.id}`} className="strip-dog">
                  <span className="portrait-wrap">
                    <DogPortrait dog={dog} size={132} decorative />
                    {dog.isDemo ? <span className="dcard-tag strip-tag">{tc('example')}</span> : isNewDog(dog, now) ? <span className="new-sticker">{td('new')}</span> : null}
                  </span>
                  <strong>{dog.name}</strong>
                  <span className="muted small">{distanceM != null && own && !dog.isDemo ? td('away', { distance: formatDistance(distanceM, locale) }) : dog.city}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {moment ? <LevelUp celebration={moment} /> : null}
    </div>
  )
}

/** The ended walks (of these) that you already told about. */
async function feedbackGiven(userId: string, walkIds: string[]): Promise<Set<string>> {
  if (walkIds.length === 0) return new Set()
  const db = await getDb()
  const rows = await db
    .select({ walkId: s.feedback.walkId })
    .from(s.feedback)
    .where(and(eq(s.feedback.fromUserId, userId), inArray(s.feedback.walkId, walkIds)))
  return new Set(rows.map((r) => r.walkId))
}

/** For each of your own dogs: walks this week and how many different people ever walked it. */
async function dogWeekStats(ownerId: string, now: Date): Promise<Map<string, { week: number; walkers: number }>> {
  const db = await getDb()
  const monday = zonedToUtc(weekOf(now), '00:00')
  const ownDogs = db.select({ id: s.dog.id }).from(s.dog).where(and(eq(s.dog.ownerId, ownerId), eq(s.dog.isDemo, false)))
  const rows = await db
    .select({
      dogId: s.walk.dogId,
      week: sql<number>`count(*) filter (where ${gte(s.walk.startedAt, monday)})`.mapWith(Number),
      walkers: sql<number>`count(distinct ${s.walk.walkerId})`.mapWith(Number),
    })
    .from(s.walk)
    .where(and(inArray(s.walk.dogId, ownDogs), eq(s.walk.status, 'ended')))
    .groupBy(s.walk.dogId)
  return new Map(rows.map((r) => [r.dogId, { week: r.week, walkers: r.walkers }]))
}
