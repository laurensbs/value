// Friendly reminders ("herinneringen") that help people come back: never a guilt trip.
//
// The rules (docs/DECISIONS.md, decision 7):
// - At most one reminder every few days, whatever the reason.
// - Only about things the person chose or started: their first steps, their weekly goal, their
//   town's challenge, walks they did before, a dog they put on Rondje, and for walkers a dog that
//   just came online near them (each dog once).
// - Ignoring them costs nothing, and the text never pretends otherwise (no "you'll lose", no sad dog).
// - Each kind stops by itself: a few first-step reminders, two "come back" reminders after a walk.
// - One switch in the profile (and in the app) turns them all off.

import { distanceM } from './geo'
import { localParts, weekOf, type Roles } from './progress'

export const NUDGE_KINDS = ['nudge-step', 'nudge-week', 'nudge-challenge', 'challenge-done', 'nudge-new-dog', 'nudge-back', 'nudge-owner'] as const
export type NudgeKind = (typeof NUDGE_KINDS)[number]

export function isNudgeKind(kind: string): kind is NudgeKind {
  return (NUDGE_KINDS as readonly string[]).includes(kind)
}

/** Never more than one reminder in this many days. */
export const NUDGE_GAP_DAYS = 3
/** First-step reminders only in the first weeks, and only a few. */
export const STEP_NUDGE_DAYS = 21
export const STEP_NUDGE_MAX = 3
/** "Zin in een rondje?" after this many quiet days, at most twice until the next walk. */
export const BACK_AFTER_DAYS = 14
export const BACK_MAX = 2
/** A dog is new for this many days after it came online, and near within this distance. */
export const NEW_DOG_DAYS = 7
export const NEW_DOG_KM = 5

export type NudgeStep = 'about' | 'dog' | 'quiz' | 'meet'

export interface SentNudge {
  kind: string
  at: Date
  data: { step?: string; tip?: string; dogId?: string }
}

export interface NudgeFacts {
  roles: Roles
  joinedAt: Date
  weeklyGoal: number | null
  /** Finished walks, ever. */
  walks: number
  lastWalkAt: Date | null
  walksThisWeek: number
  /** Accepted walks and meetings from now until the end of Sunday. */
  plannedThisWeek: number
  /** Anything coming up: an open or accepted request in the future. */
  planned: boolean
  /** Which first steps are done. */
  steps: Record<NudgeStep, boolean>
  /** This month's challenge in the person's town. */
  challenge: { city: string; goal: number; walks: number; mine: number; done: boolean } | null
  /** The dog this walker walked most, if it can still be walked. */
  favouriteDog: { id: string; name: string } | null
  /** Dogs of other owners that came online near this walker lately and that they have not asked about, nearest first. */
  newDogs: { id: string; name: string }[]
  /** An owner's dog that has been on Rondje for a while without a single request. */
  quietDog: { id: string; name: string; since: Date; photos: number; slots: number } | null
  /** Reminders sent before. */
  sent: SentNudge[]
}

/** A private owner's dog that came online in the last NEW_DOG_DAYS days (server/nudges.ts). */
export interface NewDog {
  id: string
  name: string
  ownerId: string
  country: string
  /** citySlug of its town. */
  town: string
  lat: number | null
  lng: number | null
  ppp: boolean
}

/** A dog counts as new on Rondje for NEW_DOG_DAYS: in the reminder and as a sticker on its card. */
export function isNewDog(dog: { createdAt: Date; isDemo: boolean }, now: Date): boolean {
  return !dog.isDemo && now.getTime() - dog.createdAt.getTime() < NEW_DOG_DAYS * DAY
}

/** Where a walker lives, as far as Rondje knows. */
export interface WalkerPlace {
  userId: string
  country: string
  /** citySlug of their town. */
  town: string
  lat: number | null
  lng: number | null
  pppLicense: boolean
}

/**
 * The new dogs near a walker, nearest first: within NEW_DOG_KM, or in the same town when one of
 * them has no location. Never their own dogs, dogs they already asked about, owners they blocked
 * or who blocked them, or a dog they could not ask about (a PPP dog in Spain without the licence).
 */
export function newDogsNear(
  w: WalkerPlace,
  dogs: NewDog[],
  skip: { asked: ReadonlySet<string>; blocked: ReadonlySet<string> },
): { id: string; name: string }[] {
  const near: { dog: NewDog; m: number }[] = []
  for (const dog of dogs) {
    if (dog.ownerId === w.userId || skip.asked.has(dog.id) || skip.blocked.has(dog.ownerId)) continue
    if (dog.country === 'ES' && dog.ppp && !w.pppLicense) continue
    if (w.lat != null && w.lng != null && dog.lat != null && dog.lng != null) {
      const m = distanceM({ lat: w.lat, lng: w.lng }, { lat: dog.lat, lng: dog.lng })
      if (m <= NEW_DOG_KM * 1000) near.push({ dog, m })
    } else if (w.town && dog.town === w.town && dog.country === w.country) {
      near.push({ dog, m: NEW_DOG_KM * 1000 })
    }
  }
  return near.sort((a, b) => a.m - b.m).map(({ dog }) => ({ id: dog.id, name: dog.name }))
}

export interface Nudge {
  kind: NudgeKind
  data: Record<string, string | number>
}

const DAY = 24 * 60 * 60_000

/** Days since 1970 of the local date, so "three days" means three calendar days in the Netherlands. */
function localDay(at: Date): number {
  const p = localParts(at)
  return Date.UTC(p.year, p.month - 1, p.day) / DAY
}

function monthOf(at: Date): string {
  const p = localParts(at)
  return `${p.year}-${p.month}`
}

/** The order of the first steps, as on the Today screen. */
function stepOrder(roles: Roles): NudgeStep[] {
  return ['about', ...(roles.owner ? (['dog'] as const) : []), ...(roles.walker ? (['quiz', 'meet'] as const) : [])]
}

/** The one reminder worth sending today, or null. Good news first, then what someone started. */
export function pickNudge(f: NudgeFacts, now: Date): Nudge | null {
  const today = localDay(now)
  const daysSince = (at: Date) => today - localDay(at)
  const sent = f.sent.filter((s) => isNudgeKind(s.kind))
  if (sent.some((s) => daysSince(s.at) < NUDGE_GAP_DAYS)) return null
  const sentOf = (kind: NudgeKind) => sent.filter((s) => s.kind === kind)
  const local = localParts(now)
  const age = daysSince(f.joinedAt)

  // Good news: the town reached its goal this month, and you helped.
  const c = f.challenge
  if (c?.done && c.mine > 0 && !sentOf('challenge-done').some((s) => monthOf(s.at) === monthOf(now))) {
    return { kind: 'challenge-done', data: { city: c.city, goal: c.goal, mine: c.mine } }
  }

  // The first weeks: the next first step, each step only once.
  const stepNudges = sentOf('nudge-step')
  if (age >= 1 && age <= STEP_NUDGE_DAYS && stepNudges.length < STEP_NUDGE_MAX) {
    const asked = new Set(stepNudges.map((s) => s.data.step))
    const step = stepOrder(f.roles).find((k) => !f.steps[k] && !asked.has(k))
    // Owners hear that a profile helps walkers; everyone else that it helps owners.
    if (step) return { kind: 'nudge-step', data: step === 'about' && !f.roles.walker ? { step, role: 'owner' } : { step } }
  }

  // A new month: the town's challenge, for walkers who walked before or joined recently.
  if (
    c &&
    f.roles.walker &&
    local.day <= 3 &&
    (f.walks > 0 || age <= 60) &&
    !sentOf('nudge-challenge').some((s) => monthOf(s.at) === monthOf(now))
  ) {
    return { kind: 'nudge-challenge', data: { city: c.city, goal: c.goal } }
  }

  // Thursday or Friday: the weekly goal, only while it is still within reach this week.
  if (f.roles.walker && f.weeklyGoal && f.walks > 0 && (local.weekday === 4 || local.weekday === 5)) {
    const left = f.weeklyGoal - f.walksThisWeek - f.plannedThisWeek
    const daysLeft = 8 - local.weekday
    if (left > 0 && left <= daysLeft && !sentOf('nudge-week').some((s) => weekOf(s.at) === weekOf(now))) {
      return { kind: 'nudge-week', data: { left, goal: f.weeklyGoal } }
    }
  }

  // A dog that just came online nearby: each dog once, and at most one such message a week.
  if (f.roles.walker && f.newDogs.length) {
    const told = sentOf('nudge-new-dog')
    const toldDogs = new Set(told.map((s) => s.data.dogId))
    const dog = f.newDogs.find((d) => !toldDogs.has(d.id))
    if (dog && told.every((s) => daysSince(s.at) >= 7)) return { kind: 'nudge-new-dog', data: { dogId: dog.id, dogName: dog.name } }
  }

  // Quiet for two weeks with nothing planned: an invitation, twice at most until the next walk.
  if (f.roles.walker && f.lastWalkAt && daysSince(f.lastWalkAt) >= BACK_AFTER_DAYS && !f.planned) {
    const since = sentOf('nudge-back').filter((s) => s.at > f.lastWalkAt!)
    if (since.length < BACK_MAX && since.every((s) => daysSince(s.at) >= BACK_AFTER_DAYS)) {
      const dog = f.favouriteDog
      return { kind: 'nudge-back', data: dog ? { variant: 'dog', dogId: dog.id, dogName: dog.name } : { variant: 'any' } }
    }
  }

  // An owner whose dog has had no request for a week: one practical tip, twice at most.
  const q = f.quietDog
  if (f.roles.owner && q && daysSince(q.since) >= 7) {
    const tips = sentOf('nudge-owner')
    if (tips.length < 2 && tips.every((s) => daysSince(s.at) >= 10)) {
      const given = new Set(tips.map((s) => s.data.tip))
      const options = [...(q.photos === 0 ? ['photo'] : []), ...(q.slots === 0 ? ['slots'] : []), 'share']
      const tip = options.find((o) => !given.has(o)) ?? 'share'
      return { kind: 'nudge-owner', data: { tip, dogId: q.id, dogName: q.name } }
    }
  }

  return null
}
