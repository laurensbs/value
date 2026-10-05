// "Eén ding nu": the one thing to do next, on top of Vandaag. A pure function of what the server
// knows (appointments, quiz, own dogs, real dogs nearby), the same order as the iPhone app
// (ios/Rondje/Core/NextStep.swift): what happens right now first, then what someone waits for,
// then a calm suggestion, and always an honest end ("Niks te doen. Fijne dag."). At night, steps
// that involve other people wait until the morning; something calm for yourself (the quiz, a
// lesson) is fine.
// Example dogs never become a step. Scenarios: next-step.scenarios.json (also for the iPhone tests).

import { localParts } from './progress'
import { canStartWalk, isInPerson } from './rules'

export interface NextStepAppointment {
  id: string
  dog: { id: string; name: string; isDemo: boolean }
  walkerId: string
  walkerName: string
  kind: string
  meetVia: string
  status: string
  startsAt: Date
  durationMin: number
  weekly: boolean
  walkId: string | null
  walkStatus: string | null
  /** The person looking already told how the walk went. */
  feedbackGiven: boolean
}

export interface NextStepFacts {
  now: Date
  userId: string
  walker: boolean
  owner: boolean
  quizPassed: boolean
  /** Your own dogs (examples left out by the caller or here). */
  ownDogs: { id: string; name: string; status: string; orgId: string | null; isDemo: boolean }[]
  /** Your requests as a walker. */
  outgoing: NextStepAppointment[]
  /** Requests for your dogs (or your shelter's). */
  incoming: NextStepAppointment[]
  /** Trust recorded per pair, keyed "dogId:walkerId". */
  trust: Record<string, { idSeen: boolean; soloAllowed: boolean }>
  /** Dogs near you, nearest first. Your own are left out by the caller. */
  nearby: { id: string; name: string; isDemo: boolean; distanceM: number | null; city: string }[]
  /** Said "I want to walk" at sign-up. Shelter staff did not, though rolesOf counts them as walkers. */
  wantsToWalk?: boolean
  /** The shelter you work for, with its next group walk. */
  staffOrg?: { id: string; name: string; nextGroupWalk: Date | null } | null
}

export type NextStepKind =
  | 'liveOwn'
  | 'live'
  | 'start'
  | 'decide'
  | 'debrief'
  | 'feedback'
  | 'upcoming'
  | 'quiz'
  | 'addDog'
  | 'waiting'
  | 'rebook'
  | 'share'
  | 'nearby'
  | 'emptyTown'
  | 'ownerWaiting'
  | 'shelter'
  | 'night'
  | 'done'

export interface NextStep {
  /** What "Later" and "Nee, nu niet" remember. */
  id: string
  kind: NextStepKind
  /** For the text: names, a count, a distance in metres, a moment. */
  dog?: string
  walker?: string
  count?: number
  distanceM?: number | null
  city?: string
  at?: Date
  /** The appointment is a first meeting (else a walk), and how it happens (walk, home, phone, video). */
  meet?: boolean
  via?: string
  /** The shelter's name. */
  org?: string
  /** Feedback as the owner (else as the walker). */
  asOwner?: boolean
  href: string | null
  /** "Later" may put it away for a week (and after twice, for good). */
  later: boolean
  /** "Nee, nu niet" closes it for good (a talk-over after meeting someone). */
  dismiss: boolean
}

const DAY = 86_400_000
/** Ended walks and meetings are talked over for two weeks; after that they are old news. */
const RECENT = 14 * DAY
/** "Later" puts a step away for a week. */
export const LATER_DAYS = 7
/** After twice "Later" a step does not come back. */
export const LATER_MAX = 2

/**
 * Between 23:00 and 06:00 (Dutch time) steps that involve other people (asking for a dog, planning
 * another walk, telling the neighbours) wait until the morning; what happens now still shows.
 */
export function isNight(now: Date): boolean {
  const { hour } = localParts(now)
  return hour >= 23 || hour < 6
}

const recent = (a: NextStepAppointment, now: Date) => a.startsAt.getTime() <= now.getTime() && now.getTime() - a.startsAt.getTime() <= RECENT
/** A walk that ended lately; it may have started a little before the planned time. */
const walkedLately = (a: NextStepAppointment, now: Date) => a.walkStatus === 'ended' && now.getTime() - a.startsAt.getTime() <= RECENT
const ended = (a: NextStepAppointment, now: Date) => a.startsAt.getTime() + a.durationMin * 60_000 < now.getTime()
const real = (a: NextStepAppointment) => !a.dog.isDemo

/**
 * Every step that applies, in order, ending in one that is always there (done, the empty town,
 * an owner waiting, or night). The card shows the first one that was not put away with "Later".
 */
export function nextSteps(f: NextStepFacts): NextStep[] {
  const now = f.now
  // Shelter staff did not choose to walk; they get their shelter, not dogs to ask for.
  const staff = Boolean(f.staffOrg) && !f.wantsToWalk && !f.owner
  const walker = f.walker && !staff
  const out = f.outgoing.filter(real)
  const inc = f.incoming.filter(real)
  const steps: NextStep[] = []
  const add = (s: Omit<NextStep, 'later' | 'dismiss'> & Partial<Pick<NextStep, 'later' | 'dismiss'>>) => steps.push({ later: false, dismiss: false, ...s })

  // 1. Right now: your dog is out with a walker, or you are out with a dog.
  for (const a of inc) if (a.walkStatus === 'active' && a.walkId) add({ id: `liveOwn.${a.walkId}`, kind: 'liveOwn', dog: a.dog.name, walker: a.walkerName, href: `/follow/${a.walkId}` })
  for (const a of out) if (a.walkStatus === 'active' && a.walkId) add({ id: `live.${a.walkId}`, kind: 'live', dog: a.dog.name, href: `/walk/${a.walkId}` })

  // 2. A walk or meeting that can start now (the same window as the start button).
  const startable = out
    .filter((a) => a.walkStatus !== 'active' && a.walkStatus !== 'ended' && canStartWalk({ status: a.status, startsAt: a.startsAt, walkerId: f.userId, meetVia: a.meetVia }, f.userId, now))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  for (const a of startable) add({ id: `start.${a.id}`, kind: 'start', dog: a.dog.name, at: a.startsAt, meet: a.kind === 'meet', href: '/requests' })

  // 3. Someone asks to walk your dog: look first who it is.
  const pending = inc.filter((a) => a.status === 'pending').sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  if (pending.length) add({ id: 'decide', kind: 'decide', dog: pending[0].dog.name, walker: pending[0].walkerName, count: pending.length, href: '/requests?view=incoming' })

  // 4. After meeting in person: how was it? "Bekijk" goes to the trust form, "Nee, nu niet" closes it
  // for this walker. Nothing is sent to the walker either way.
  const seen = new Set<string>()
  const met = inc
    .filter((a) => a.kind === 'meet' && isInPerson(a.meetVia) && recent(a, now) && (a.status === 'completed' || (a.status === 'accepted' && ended(a, now))))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
  for (const a of met) {
    const pair = `${a.dog.id}:${a.walkerId}`
    const trust = f.trust[pair]
    if (seen.has(pair) || trust?.idSeen || trust?.soloAllowed) continue
    seen.add(pair)
    add({ id: `debrief.${a.dog.id}.${a.walkerId}`, kind: 'debrief', dog: a.dog.name, walker: a.walkerName, href: '/requests?view=incoming#trust-pairs-title', dismiss: true })
  }

  // 5. Two taps about a walk that ended, as walker or as owner.
  const feedback = [...out.map((a) => [a, false] as const), ...inc.map((a) => [a, true] as const)]
    .filter(([a]) => walkedLately(a, now) && a.walkId && !a.feedbackGiven)
    .sort(([a], [b]) => b.startsAt.getTime() - a.startsAt.getTime())
  for (const [a, asOwner] of feedback) {
    add({ id: `feedback.${a.walkId}`, kind: 'feedback', dog: a.dog.name, walker: a.walkerName, asOwner, href: `${asOwner ? '/follow' : '/walk'}/${a.walkId}#feedback`, later: true })
  }

  // 6. The next appointment, as walker or as owner.
  const upcoming = [...out.map((a) => [a, false] as const), ...inc.map((a) => [a, true] as const)]
    .filter(([a]) => a.status === 'accepted' && a.startsAt.getTime() > now.getTime() && !a.walkStatus && !startable.includes(a))
    .sort(([a], [b]) => a.startsAt.getTime() - b.startsAt.getTime())[0]
  if (upcoming) {
    const [a, asOwner] = upcoming
    add({
      id: `upcoming.${a.id}`,
      kind: 'upcoming',
      dog: a.dog.name,
      walker: a.walkerName,
      at: a.startsAt,
      meet: a.kind === 'meet',
      via: a.meetVia,
      asOwner,
      href: asOwner ? '/requests?view=incoming' : '/requests',
    })
  }

  // From here on: suggestions. The ones with other people in them ("social") wait at night.
  const suggestions: { step: NextStep; social: boolean }[] = []
  const suggest = (s: Omit<NextStep, 'later' | 'dismiss'>, social = false) => suggestions.push({ step: { later: true, dismiss: false, ...s }, social })
  const ownDogs = f.ownDogs.filter((d) => !d.isDemo)

  // 7. Shelter staff: their shelter, with the next group walk or a nudge to plan one.
  if (staff && f.staffOrg) {
    suggest({ id: 'shelter', kind: 'shelter', org: f.staffOrg.name, at: f.staffOrg.nextGroupWalk ?? undefined, href: `/shelter/${f.staffOrg.id}` })
  }
  // 8. The safety quiz comes before any request (the server checks it too). Fine at night.
  if (walker && !f.quizPassed) suggest({ id: 'quiz', kind: 'quiz', href: '/profile/quiz?next=%2F' })
  // 9. No dog on Rondje yet.
  if (f.owner && ownDogs.length === 0) suggest({ id: 'addDog', kind: 'addDog', href: '/my-dogs/new' })
  // 10. A request the owner is still looking at.
  const waiting = out.filter((a) => a.status === 'pending').sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0]
  if (waiting) suggest({ id: `waiting.${waiting.id}`, kind: 'waiting', dog: waiting.dog.name, href: '/requests' })
  // 11. Another walk with a dog you walked in the last two weeks, when nothing is planned with it.
  const open = new Set(
    out.filter((a) => a.walkStatus !== 'ended' && (a.status === 'pending' || (a.status === 'accepted' && a.startsAt.getTime() > now.getTime()))).map((a) => a.dog.id),
  )
  const rebook = out
    .filter((a) => walkedLately(a, now) && !a.weekly && !open.has(a.dog.id))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0]
  if (rebook) suggest({ id: 'rebook', kind: 'rebook', dog: rebook.dog.name, href: `/dogs/${rebook.dog.id}#plan` }, true)
  // 12. Your dog is online and nobody asked yet: tell the neighbours.
  const asked = new Set(inc.map((a) => a.dog.id))
  const share = ownDogs.find((d) => d.status === 'active' && !d.orgId && !asked.has(d.id))
  if (share) suggest({ id: `share.${share.id}`, kind: 'share', dog: share.name, href: `/dogs/${share.id}#share` }, true)
  // 13. Real dogs near you; the nearest first. 14. None: we start here.
  if (walker) {
    const near = f.nearby.filter((d) => !d.isDemo)
    if (near.length) {
      const [first] = near
      suggest({ id: 'nearby', kind: 'nearby', dog: first.name, distanceM: first.distanceM, city: first.city, count: near.length - 1, href: `/dogs/${first.id}` }, true)
    }
  }

  // At night the first step with other people in it becomes a calm end: it is late, planning can
  // wait, and a walker can read a lesson in the meantime.
  const night = isNight(now)
  for (const { step, social } of suggestions) {
    if (night && social) {
      steps.push({ id: 'night', kind: 'night', href: walker ? '/school' : null, later: false, dismiss: false })
      return steps
    }
    steps.push(step)
  }

  // The end that is always there.
  if (walker && !f.nearby.some((d) => !d.isDemo)) {
    steps.push({ id: 'emptyTown', kind: 'emptyTown', href: '/group-walks', later: false, dismiss: false })
  } else if (f.owner && ownDogs.some((d) => d.status === 'active')) {
    const dog = ownDogs.find((d) => d.status === 'active')!
    steps.push({ id: 'ownerWaiting', kind: 'ownerWaiting', dog: dog.name, href: `/dogs/${dog.id}`, later: false, dismiss: false })
  } else {
    steps.push({ id: 'done', kind: 'done', href: null, later: false, dismiss: false })
  }
  return steps
}

// --- "Later" and "Nee, nu niet", remembered in this browser only ---
// In a cookie, so the server already shows the right step (nothing jumps after the page loads).
// The server only reads it to pick the step; it is never stored (cookie statement: rondje_later).

export type LaterStore = Record<string, { until?: number; count?: number; closed?: boolean }>

export const LATER_COOKIE = 'rondje_later'
/** At most this many steps are remembered; the oldest go first. */
const LATER_KEEP = 40

/** The store from the cookie's (decoded) value; anything unreadable is an empty store. */
export function parseLater(raw: string | null | undefined): LaterStore {
  if (!raw) return {}
  try {
    const value: unknown = JSON.parse(raw)
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as LaterStore) : {}
  } catch {
    return {}
  }
}

/** The store as it goes into the cookie: small, the most recent steps kept. */
export function serializeLater(store: LaterStore): string {
  const entries = Object.entries(store).sort(([, a], [, b]) => (b.until ?? Infinity) - (a.until ?? Infinity))
  return JSON.stringify(Object.fromEntries(entries.slice(0, LATER_KEEP)))
}

/** Puts a step away for a week; the second time for good. */
export function putLater(store: LaterStore, id: string, now = Date.now()): LaterStore {
  const count = (store[id]?.count ?? 0) + 1
  return { ...store, [id]: { ...store[id], count, until: now + LATER_DAYS * DAY } }
}

/** Closes a step for good ("Nee, nu niet"). */
export function closeStep(store: LaterStore, id: string): LaterStore {
  return { ...store, [id]: { ...store[id], closed: true } }
}

/** Whether a step was put away (and is still away). */
export function isPutAway(store: LaterStore, id: string, now = Date.now()): boolean {
  const entry = store[id]
  if (!entry) return false
  return Boolean(entry.closed) || (entry.count ?? 0) >= LATER_MAX || (entry.until ?? 0) > now
}

/** The step to show: the first one that may not be put away, or was not. */
export function pickStep<T extends { id: string; later: boolean; dismiss: boolean }>(steps: T[], store: LaterStore, now = Date.now()): T | null {
  return steps.find((s) => !(s.later || s.dismiss) || !isPutAway(store, s.id, now)) ?? null
}
