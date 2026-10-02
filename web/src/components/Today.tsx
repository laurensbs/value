import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import Link from 'next/link'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { MASCOT } from '@/lib/avatar'
import { countryInfo, isCountry } from '@/lib/countries'
import { formatDistance } from '@/lib/geo'
import { BACK_AFTER_DAYS } from '@/lib/nudges'
import { BADGES, bondFor, localParts, STEP_POINTS, weekOf } from '@/lib/progress'
import { zonedToUtc } from '@/lib/time'
import { challengesFor } from '@/server/challenges'
import { dogFriendsFor, progressFor } from '@/server/progress'
import { progressJson } from '@/server/progress-json'
import { webPushKey } from '@/server/push'
import { impactTotals, incomingRequests, listDogs, myDogs, outgoingRequests, type RequestRow } from '@/server/queries'
import type { OnboardedViewer } from '@/server/session'
import { Celebration } from './Celebration'
import { ChallengeCard } from './ChallengeCard'
import { DogFace } from './DogFace'
import { DogPortrait } from './DogPortrait'
import { Icon } from './Icon'
import { Medal } from './Medal'
import { PushAsk } from './PushAsk'
import { WeekCard } from './WeekCard'

const WALKER_TIPS = 10
const OWNER_TIPS = 8

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

/** The next accepted meeting or walk, as walker or as host, from half an hour ago on. */
function nextAppointment(rows: RequestRow[], now: Date): RequestRow | null {
  const from = now.getTime() - 30 * 60_000
  return (
    rows
      .filter((r) => r.request.status === 'accepted' && r.request.startsAt.getTime() >= from && r.walkStatus !== 'ended')
      .sort((a, b) => a.request.startsAt.getTime() - b.request.startsAt.getTime())[0] ?? null
  )
}

/**
 * The home screen for members: what to do next, this week, and the town's challenge, adapted to
 * whether someone walks, has a dog, or both. Everything is pre-chewed: one obvious next step.
 */
export async function Today({ viewer, welcome }: { viewer: OnboardedViewer; welcome: boolean }) {
  const now = new Date()
  const t = await getTranslations('today')
  const tp = await getTranslations('progress')
  const td = await getTranslations('dogs')
  const tpa = await getTranslations('pushAsk')
  const format = await getFormatter()
  const locale = await getLocale()
  const p = viewer.profile
  const hasOrg = viewer.orgs.length > 0

  const progress = await progressFor(viewer, now)
  const { walker, owner } = progress.roles
  const country = isCountry(p.country) ? p.country : undefined
  const near = p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : country ? countryInfo(country).center : null

  const [json, challenges, outgoing, incoming, dogs, nearby, impact, friends] = await Promise.all([
    progressJson(progress),
    challengesFor(viewer, now),
    walker ? outgoingRequests(viewer.userId) : Promise.resolve([]),
    owner || hasOrg ? incomingRequests(viewer) : Promise.resolve([]),
    owner ? myDogs(viewer) : Promise.resolve([]),
    walker ? listDogs({ country, near }, 8) : Promise.resolve([]),
    impactTotals(),
    walker ? dogFriendsFor(viewer.userId) : Promise.resolve([]),
  ])

  const ownDogs = dogs.filter((d) => !d.isDemo)
  const dogStats = await dogWeekStats(
    ownDogs.map((d) => d.id),
    now,
  )
  const nearbyDogs = nearby.filter((item) => item.dog.ownerId !== viewer.userId).slice(0, 6)
  const next = nextAppointment([...outgoing, ...incoming], now)
  const pending = incoming.filter((r) => r.request.status === 'pending').length
  // Back after a quiet while, with nothing planned: an invitation to walk a dog they already know.
  const lastWalk = Math.max(0, ...friends.map((f) => f.lastAt?.getTime() ?? 0))
  const planned = outgoing.some((r) => (r.request.status === 'pending' || r.request.status === 'accepted') && r.request.startsAt > now)
  const backFriend =
    lastWalk && now.getTime() - lastWalk >= BACK_AFTER_DAYS * 86_400_000 && !planned ? (friends.find((f) => f.dog.status === 'active') ?? null) : null

  const hour = localParts(now).hour
  const stepsLeft = json.steps.filter((step) => !step.done)
  const nextStep = stepsLeft[0] ?? null
  const earned = json.badges.filter((b) => b.tier > 0)
  const recentBadges = [...earned].sort((a, b) => String(b.earnedAt ?? '').localeCompare(String(a.earnedAt ?? ''))).slice(0, 4)
  const day = dayOfYear(now)
  const tip = !walker || (owner && day % 2 === 1) ? t(`tips.owner.${(day % OWNER_TIPS) + 1}`) : t(`tips.walker.${(day % WALKER_TIPS) + 1}`)

  const celebrate = progress.levelUp || progress.newAwards.length > 0
  const pushKey = webPushKey()
  const pushText = owner && ownDogs[0] ? tpa('dog', { dog: ownDogs[0].name }) : walker ? tpa('walker') : tpa('general')

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

      {welcome ? (
        <section className="welcome-card" aria-labelledby="welcome-title">
          <DogFace look={MASCOT} size={72} />
          <div className="stack-s">
            <h2 id="welcome-title">{t('welcomeTitle', { name: p.firstName })}</h2>
            <p>{t('welcomeText', { level: json.level.name })}</p>
          </div>
        </section>
      ) : null}

      {next ? (
        <Link href={next.request.kind === 'meet' || next.walkStatus !== 'active' ? '/requests' : `/walk/${next.walkId}`} className="next-card">
          <DogPortrait dog={next.dog} size={56} />
          <span className="stack-s">
            <span className="eyebrow">{t('next')}</span>
            <strong>
              {t(next.request.kind === 'meet' ? 'nextMeeting' : 'nextWalk', {
                when: format.dateTime(next.request.startsAt, { weekday: 'long', hour: '2-digit', minute: '2-digit' }),
                dog: next.dog.name,
              })}
            </strong>
          </span>
          <Icon name="arrow" size={20} />
        </Link>
      ) : null}

      {backFriend ? (
        <section className="card back-card" aria-labelledby="back-title">
          <DogPortrait dog={backFriend.dog} size={72} />
          <div className="stack-s">
            <h2 id="back-title" className="small-title">
              {t('backTitle')}
            </h2>
            <p>{t('backText', { dog: backFriend.dog.name, bond: tp(`friends.bond.${bondFor(backFriend.walks)}`) })}</p>
            <Link href={`/dogs/${backFriend.dog.id}#plan`} className="button primary small">
              {t('backPlan', { dog: backFriend.dog.name })}
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </section>
      ) : null}

      {pending > 0 ? (
        <Link href="/requests" className="notice warn pending-card">
          <Icon name="bell" size={20} />
          <span>
            <strong>{t('pending', { n: pending })}</strong>
            <span className="link-button">{t('pendingOpen')}</span>
          </span>
        </Link>
      ) : null}

      {nextStep ? (
        <section className="card first-steps" aria-labelledby="steps-title">
          <div className="spread">
            <h2 id="steps-title" className="small-title">
              {t('stepsTitle')}
            </h2>
            <span className="muted small">{t('stepsCount', { done: json.steps.length - stepsLeft.length, total: json.steps.length })}</span>
          </div>
          <div className="steps-bar" aria-hidden="true">
            <span style={{ width: `${((json.steps.length - stepsLeft.length) / json.steps.length) * 100}%` }} />
          </div>
          <ol className="step-path">
            {json.steps.map((step) => {
              const current = step.key === nextStep.key
              return (
                <li key={step.key} className={step.done ? 'done' : current ? 'current' : undefined}>
                  <span className="step-dot" aria-hidden="true">
                    {step.done ? <Icon name="check" size={16} /> : current ? <Icon name="paw" size={16} /> : null}
                  </span>
                  <div className="step-body">
                    <span className="step-title">
                      {step.done ? <span className="visually-hidden">✓ </span> : null}
                      {step.title}
                      {!step.done && STEP_POINTS[step.key] ? <span className="pill ball">+{STEP_POINTS[step.key]}</span> : null}
                    </span>
                    {current ? <span className="muted small">{step.hint}</span> : null}
                    {current ? (
                      <Link href={step.href} className="button primary small">
                        {t('start')}
                        <Icon name="arrow" size={16} />
                      </Link>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      {pushKey ? <PushAsk publicKey={pushKey} text={pushText} /> : null}

      <div className="today-grid">
        {walker ? <WeekCard goal={progress.weeklyGoal} walks={progress.walksThisWeek} days={progress.weekDays} activeWeeks={progress.activeWeeks} now={now} /> : null}
        <ChallengeCard challenges={challenges} now={now} />
      </div>

      {owner ? (
        <section className="stack" aria-labelledby="my-dogs-title">
          <div className="section-title">
            <h2 id="my-dogs-title">{t('myDogsTitle')}</h2>
            <Link href="/my-dogs/new" className="link-button small">
              <Icon name="plus" size={16} /> {t('addDog')}
            </Link>
          </div>
          {ownDogs.length ? (
            <ul className="mini-dogs">
              {ownDogs.map((dog) => (
                <li key={dog.id}>
                  <Link href={`/dogs/${dog.id}`} className="mini-dog">
                    <DogPortrait dog={dog} size={64} />
                    <span className="stack-s">
                      <strong>{dog.name}</strong>
                      <span className="muted small">{t('dogWeek', { n: dogStats.get(dog.id)?.week ?? 0 })}</span>
                      <span className="muted small">{t('dogFriends', { n: dogStats.get(dog.id)?.walkers ?? 0 })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link href="/my-dogs/new" className="card add-dog-card">
              <span className="option-icon">
                <Icon name="plus" />
              </span>
              <span>
                <strong>{t('steps.dog.title')}</strong>
                <span className="muted small">{t('steps.dog.hint')}</span>
              </span>
            </Link>
          )}
        </section>
      ) : null}

      {walker ? (
        <section className="stack" aria-labelledby="near-title">
          <div className="section-title">
            <h2 id="near-title">{t('nearTitle')}</h2>
            <Link href="/dogs" className="link-button small">
              {t('nearAll')}
            </Link>
          </div>
          {nearbyDogs.length ? (
            <ul className="dog-strip">
              {nearbyDogs.map(({ dog, distanceM }) => (
                <li key={dog.id}>
                  <Link href={`/dogs/${dog.id}`} className="strip-dog">
                    <DogPortrait dog={dog} size={132} />
                    <strong>{dog.name}</strong>
                    <span className="muted small">{distanceM != null && !dog.isDemo ? td('away', { distance: formatDistance(distanceM, locale) }) : dog.city}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card flat stack-s">
              <p className="muted">{t('nearEmpty')}</p>
              <Link href="/profile#invite" className="link-button">
                {t('nearInvite')}
              </Link>
            </div>
          )}
        </section>
      ) : null}

      <section className="card badges-card" aria-labelledby="badges-title">
        <div className="section-title">
          <h2 id="badges-title" className="small-title">
            {t('badgesTitle')}
          </h2>
          <Link href="/progress" className="link-button small">
            {t('badgesAll')}
          </Link>
        </div>
        {recentBadges.length ? (
          <ul className="medal-row">
            {recentBadges.map((b) => (
              <li key={b.key}>
                <Medal icon={b.icon} color={b.color} size={52} />
                <span className="small">{b.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="row">
            <Medal icon="paw" color={null} size={52} />
            <p className="muted small">{t('badgesEmpty')}</p>
          </div>
        )}
      </section>

      <section className="tip-card" aria-labelledby="tip-title">
        <p id="tip-title" className="eyebrow">
          <Icon name="sparkle" size={14} /> {t('tipTitle')}
        </p>
        <p className="hand">{tip}</p>
      </section>

      {impact.walks > 0 ? <p className="together muted small">{t('together', { walks: impact.walks, dogs: impact.dogs })}</p> : null}

      {celebrate ? (
        <Celebration
          level={json.level.number}
          levelUp={progress.levelUp ? json.level.name : null}
          awards={json.newAwards.map((a) => ({ key: a.key, tier: a.tier, icon: a.icon ?? BADGES[0].icon, title: a.title, color: a.color }))}
        />
      ) : null}
    </div>
  )
}

/** For each of your dogs: walks this week and how many different people ever walked it. */
async function dogWeekStats(dogIds: string[], now: Date): Promise<Map<string, { week: number; walkers: number }>> {
  if (dogIds.length === 0) return new Map()
  const db = await getDb()
  const monday = zonedToUtc(weekOf(now), '00:00')
  const rows = await db
    .select({
      dogId: s.walk.dogId,
      week: sql<number>`count(*) filter (where ${gte(s.walk.startedAt, monday)})`.mapWith(Number),
      walkers: sql<number>`count(distinct ${s.walk.walkerId})`.mapWith(Number),
    })
    .from(s.walk)
    .where(and(inArray(s.walk.dogId, dogIds), eq(s.walk.status, 'ended')))
    .groupBy(s.walk.dogId)
  return new Map(rows.map((r) => [r.dogId, { week: r.week, walkers: r.walkers }]))
}
