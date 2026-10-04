// Seintjes: reminders with no news behind them. Calm by design, never a guilt trip.
//
// The rules (docs/DECISIONS.md, decision 36, and the research "Duolingo-achtig, zonder druk" §3.4):
// - Only for people who turned them on themselves (profile.reminders, off for new profiles).
// - At most one every seven days, whatever the kind. Real events (a request, an answer, an
//   appointment) are not seintjes: they come as notifications whatever this setting says.
// - Only about things the person chose or started: their first steps, their town's challenge, a dog
//   they put on Rondje, and for walkers a dog that just came online near them (each dog once).
// - No countdowns, no "we miss you", no deadlines: lib/banned-phrases.json is checked in a test.
// - Three in a row that led to nothing, and they stop by themselves when the fourth would be due:
//   the switch goes off, and the app says so in one line (never a push). Nothing about opens is
//   stored for this.
// - Someone whose iPhone plans its own seintjes (profile.localNudges) gets none from the server:
//   not as a push, not by email and not in the notification list.

import { nearness, shownCount, type Place } from './nearby'
import { localParts, type Roles } from './progress'

export const NUDGE_KINDS = ['nudge-step', 'nudge-challenge', 'challenge-done', 'nudge-new-dog', 'nudge-owner'] as const
export type NudgeKind = (typeof NUDGE_KINDS)[number]

export function isNudgeKind(kind: string): kind is NudgeKind {
  return (NUDGE_KINDS as readonly string[]).includes(kind)
}

/**
 * Every seintje, also kinds that are no longer sent: older rows keep their kind. All of them count
 * for the seven days and the three in a row. Their names all start with "nudge-", except the good news.
 */
export function isSeintje(kind: string): boolean {
  return kind.startsWith('nudge-') || kind === 'challenge-done'
}

/** A seintje kind that is no longer sent: hidden from the notification list (it has no text any more). */
export function isRetiredNudge(kind: string): boolean {
  return isSeintje(kind) && !isNudgeKind(kind)
}

/** Never more than one seintje in this many days. */
export const NUDGE_GAP_DAYS = 7
/** After this many seintjes in a row with nothing done after them, they stop. */
export const IGNORED_MAX = 3
/** First-step reminders only in the first weeks, and only a few. */
export const STEP_NUDGE_DAYS = 21
export const STEP_NUDGE_MAX = 3
/** A dog is new for this many days after it came online. */
export const NEW_DOG_DAYS = 7
export type NudgeStep = 'about' | 'dog' | 'quiz' | 'meet'

export interface SentNudge {
  kind: string
  at: Date
  data: { step?: string; dogId?: string }
}

export interface NudgeFacts {
  roles: Roles
  joinedAt: Date
  /** Finished walks, ever. */
  walks: number
  /** Which first steps are done. */
  steps: Record<NudgeStep, boolean>
  /** This month's challenge in the person's town. */
  challenge: { city: string; goal: number; walks: number; mine: number; done: boolean } | null
  /** Dogs of other owners that came online near this walker lately and that they have not asked about, nearest first. */
  newDogs: { id: string; name: string }[]
  /** An owner's dog that has been on Rondje for a while without a single request, and how many walkers live nearby. */
  quietDog: { id: string; name: string; since: Date; walkersNear: number } | null
  /** The last time this person did something: asked, walked, wrote, changed a dog or their profile. */
  lastActiveAt: Date | null
  /** Seintjes sent before (every kind that isSeintje). */
  sent: SentNudge[]
}

/** A private owner's dog that came online in the last NEW_DOG_DAYS days (server/nudges.ts). */
export interface NewDog extends Place {
  id: string
  name: string
  ownerId: string
  ppp: boolean
}

/** A dog counts as new on Rondje for NEW_DOG_DAYS: in the reminder and as a sticker on its card. */
export function isNewDog(dog: { createdAt: Date; isDemo: boolean }, now: Date): boolean {
  return !dog.isDemo && now.getTime() - dog.createdAt.getTime() < NEW_DOG_DAYS * DAY
}

/** Where a walker lives, as far as Rondje knows. */
export interface WalkerPlace extends Place {
  userId: string
  pppLicense: boolean
}

/**
 * The new dogs near a walker (see lib/nearby.ts), nearest first. Never their own dogs, dogs they
 * already asked about, owners they blocked or who blocked them, or a dog they could not ask about
 * (a PPP dog in Spain without the licence).
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
    const m = nearness(w, dog)
    if (m != null) near.push({ dog, m })
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

/** A seintje of any kind (also one no longer sent) in the last seven calendar days. */
export function sentTooRecently(sent: readonly SentNudge[], now: Date): boolean {
  return sent.some((s) => isSeintje(s.kind) && localDay(now) - localDay(s.at) < NUDGE_GAP_DAYS)
}

/**
 * Three seintjes in a row and nothing done since the first of them: they stop, on the day the
 * fourth would be due (a week after the third). Counted from what people did (lastActiveAt, see
 * server/nudges.ts), never from whether a notification was opened. Only kinds sent today count,
 * and only a week apart as the weekly rule sends them: seintjes of kinds no longer sent, or three
 * that came closer together, never switch anyone off.
 */
export function ignoredInARow(sent: readonly SentNudge[], lastActiveAt: Date | null, now: Date): boolean {
  const latest = sent
    .filter((s) => isNudgeKind(s.kind))
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, IGNORED_MAX)
  if (latest.length < IGNORED_MAX) return false
  const weekApart = latest.every((s, i) => i === 0 || localDay(latest[i - 1].at) - localDay(s.at) >= NUDGE_GAP_DAYS)
  const fourthDue = localDay(now) - localDay(latest[0].at) >= NUDGE_GAP_DAYS
  return weekApart && fourthDue && latest.every((s) => !lastActiveAt || s.at > lastActiveAt)
}

/** The one seintje worth sending today, or null. Good news first, then what someone started. */
export function pickNudge(f: NudgeFacts, now: Date): Nudge | null {
  const today = localDay(now)
  const daysSince = (at: Date) => today - localDay(at)
  const sent = f.sent.filter((s) => isSeintje(s.kind))
  if (sentTooRecently(sent, now)) return null
  if (ignoredInARow(sent, f.lastActiveAt, now)) return null
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

  // A dog that just came online nearby: each dog once.
  if (f.roles.walker && f.newDogs.length) {
    const toldDogs = new Set(sentOf('nudge-new-dog').map((s) => s.data.dogId))
    const dog = f.newDogs.find((d) => !toldDogs.has(d.id))
    if (dog) return { kind: 'nudge-new-dog', data: { dogId: dog.id, dogName: dog.name } }
  }

  // An owner whose dog has had no request for a week while few walkers live nearby (too few to show
  // a count, as on Today): that we look too. Once per dog, never "no request yet".
  const q = f.quietDog
  if (f.roles.owner && q && daysSince(q.since) >= 7 && shownCount(q.walkersNear) == null && !sentOf('nudge-owner').some((s) => s.data.dogId === q.id)) {
    return { kind: 'nudge-owner', data: { dogId: q.id, dogName: q.name } }
  }

  return null
}
