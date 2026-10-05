// Points, levels and badges ("penningen"): playful, private, and never taken away.
//
// The rules of the game (docs/DECISIONS.md, decision 7):
// - Points come from real things that help a dog or its owner: a walk, the walk report, a photo for
//   the owner, honest feedback, the safety quiz, a shelter group walk, a friend who joins.
// - Every walk counts the same, however short: a slow round with an old dog is just as good.
// - Nothing is ever lost: no streaks to break, no points taken away.
// - Only you see your level and badges. They never give priority and are not a trust signal.
// - Saying yes to a request never earns points: that decision is about safety only.

import { TIME_ZONE } from './time'

export const POINTS = {
  /** A walk you did, of any length. */
  walk: 25,
  /** You kept the pee, poo and water report for the owner. */
  'walk-care': 5,
  /** You shared a photo with the owner during the walk. */
  'walk-photo': 5,
  /** You filled in the private feedback after a walk. */
  feedback: 5,
  /** Your dog went for a walk with someone. */
  'dog-walked': 10,
  /** You joined a shelter's group walk (the shelter marked you present). */
  'group-walk': 30,
  quiz: 15,
  /** A profile photo and a few sentences about yourself. */
  profile: 10,
  /** You put your (first) dog on Rondje. */
  'first-dog': 15,
  /** Someone joined through your invite link. */
  invite: 25,
} as const

export type PointKind = keyof typeof POINTS

export function isPointKind(kind: string): kind is PointKind {
  return Object.hasOwn(POINTS, kind)
}

/** A bio counts as "a few sentences" from this many characters. */
export const ABOUT_MIN_LENGTH = 20

/** Points needed for levels 1 to 10. Early levels come quickly, later ones take months. */
export const LEVELS = [0, 25, 75, 150, 250, 400, 600, 850, 1150, 1500] as const
export const LEVEL_KEYS = ['puppy', 'sniffer', 'tracker', 'buddy', 'regular', 'local', 'leader', 'whisperer', 'hero', 'legend'] as const
export type LevelKey = (typeof LEVEL_KEYS)[number]

export interface LevelInfo {
  /** 1 to 10. */
  level: number
  key: LevelKey
  /** Points at which this level started. */
  floor: number
  /** Points needed for the next level, or null at the top. */
  next: number | null
  nextKey: LevelKey | null
  /** 0 to 1 on the way to the next level (1 at the top). */
  progress: number
}

export function levelFor(points: number): LevelInfo {
  let i = 0
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1]) i++
  const floor = LEVELS[i]
  const next = i + 1 < LEVELS.length ? LEVELS[i + 1] : null
  return {
    level: i + 1,
    key: LEVEL_KEYS[i],
    floor,
    next,
    nextKey: next == null ? null : LEVEL_KEYS[i + 1],
    progress: next == null ? 1 : Math.min(1, Math.max(0, (points - floor) / (next - floor))),
  }
}

export interface PointEvent {
  kind: string
  ref: string
  points: number
  at: Date
  meta: { dogId?: string; walkerId?: string; orgId?: string }
}

// --- Local time (Netherlands, Belgium and Spain share one time zone) ---

interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  /** 1 = Monday … 7 = Sunday. */
  weekday: number
}

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  weekday: 'short',
})
const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

export function localParts(at: Date): LocalParts {
  const parts = Object.fromEntries(partsFormat.formatToParts(at).map((p) => [p.type, p.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    weekday: WEEKDAYS[parts.weekday] ?? 1,
  }
}

/** The local date (YYYY-MM-DD) of the Monday of the week `at` falls in. */
export function weekOf(at: Date): string {
  const p = localParts(at)
  const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - (p.weekday - 1)))
  return monday.toISOString().slice(0, 10)
}

/** Meteorological seasons: winter is December to February. */
export function seasonOf(at: Date): 'winter' | 'spring' | 'summer' | 'autumn' {
  const m = localParts(at).month
  if (m === 12 || m <= 2) return 'winter'
  if (m <= 5) return 'spring'
  if (m <= 8) return 'summer'
  return 'autumn'
}

// --- Stats and badges ---

export interface ProgressStats {
  walks: number
  /** Different dogs walked. */
  dogs: number
  /** Most walks with one and the same dog. */
  buddy: number
  /** Walks started before 08:00. */
  early: number
  /** Walks started from 20:00. */
  evening: number
  weekend: number
  /** Different seasons with a walk (4 = all of them). */
  seasons: number
  /** Walks with a photo for the owner. */
  photos: number
  /** Walks with a pee/poo/water report. */
  reports: number
  groupWalks: number
  invites: number
  quiz: number
  /** Walks your own dogs got. */
  dogWalks: number
  /** Different people who walked your dogs. */
  dogFriends: number
}

export function statsFrom(events: PointEvent[]): ProgressStats {
  const walks = events.filter((e) => e.kind === 'walk')
  const perDog = new Map<string, number>()
  const seasons = new Set<string>()
  let early = 0
  let evening = 0
  let weekend = 0
  for (const w of walks) {
    if (w.meta.dogId) perDog.set(w.meta.dogId, (perDog.get(w.meta.dogId) ?? 0) + 1)
    const p = localParts(w.at)
    if (p.hour < 8) early++
    if (p.hour >= 20) evening++
    if (p.weekday >= 6) weekend++
    seasons.add(seasonOf(w.at))
  }
  const count = (kind: PointKind) => events.filter((e) => e.kind === kind).length
  const dogWalks = events.filter((e) => e.kind === 'dog-walked')
  return {
    walks: walks.length,
    dogs: perDog.size,
    buddy: Math.max(0, ...perDog.values()),
    early,
    evening,
    weekend,
    seasons: seasons.size,
    photos: count('walk-photo'),
    reports: count('walk-care'),
    groupWalks: count('group-walk'),
    invites: count('invite'),
    quiz: count('quiz'),
    dogWalks: dogWalks.length,
    dogFriends: new Set(dogWalks.map((e) => e.meta.walkerId).filter(Boolean)).size,
  }
}

export type BadgeIcon = 'paw' | 'heart' | 'users' | 'sun' | 'moon' | 'calendar' | 'leaf' | 'camera' | 'list' | 'building' | 'shield' | 'home' | 'share'

interface BadgeDef {
  key: string
  stat: keyof ProgressStats
  /** Thresholds per tier, lowest first. */
  tiers: readonly number[]
  icon: BadgeIcon
  /** Who sees it before earning it: walkers, owners or everyone. */
  for: 'walker' | 'owner' | 'all'
}

export const BADGES: readonly BadgeDef[] = [
  { key: 'walks', stat: 'walks', tiers: [1, 10, 25, 50, 100], icon: 'paw', for: 'walker' },
  // In line with the friendship labels below: good friends at 5 walks, best friends at 10.
  { key: 'buddy', stat: 'buddy', tiers: [5, 10, 25], icon: 'heart', for: 'walker' },
  { key: 'pack', stat: 'dogs', tiers: [3, 5, 10], icon: 'users', for: 'walker' },
  { key: 'early', stat: 'early', tiers: [1, 10], icon: 'sun', for: 'walker' },
  { key: 'evening', stat: 'evening', tiers: [1, 10], icon: 'moon', for: 'walker' },
  { key: 'weekend', stat: 'weekend', tiers: [5, 25], icon: 'calendar', for: 'walker' },
  { key: 'seasons', stat: 'seasons', tiers: [4], icon: 'leaf', for: 'walker' },
  { key: 'photos', stat: 'photos', tiers: [5, 25], icon: 'camera', for: 'walker' },
  { key: 'reports', stat: 'reports', tiers: [5, 25], icon: 'list', for: 'walker' },
  { key: 'shelter', stat: 'groupWalks', tiers: [1, 5, 10], icon: 'building', for: 'walker' },
  { key: 'quiz', stat: 'quiz', tiers: [1], icon: 'shield', for: 'walker' },
  { key: 'host', stat: 'dogWalks', tiers: [1, 10, 50], icon: 'home', for: 'owner' },
  { key: 'friends', stat: 'dogFriends', tiers: [2, 5], icon: 'users', for: 'owner' },
  { key: 'invite', stat: 'invites', tiers: [1, 3, 10], icon: 'share', for: 'all' },
]

export interface BadgeState {
  key: string
  icon: BadgeIcon
  tiers: readonly number[]
  /** Where the person is now, e.g. 7 walks. */
  value: number
  /** Tiers reached: 0 = not earned yet. */
  tier: number
  /** The next threshold, or null when every tier is earned. */
  next: number | null
}

export interface Roles {
  walker: boolean
  owner: boolean
}

/** Every badge that is earned or within reach for these roles, earned ones first. */
export function badgesFor(stats: ProgressStats, roles: Roles): BadgeState[] {
  const states = BADGES.map((b): BadgeState => {
    const value = stats[b.stat]
    const tier = b.tiers.filter((t) => value >= t).length
    return { key: b.key, icon: b.icon, tiers: b.tiers, value, tier, next: b.tiers[tier] ?? null }
  })
  const relevant = (b: BadgeDef) => b.for === 'all' || (b.for === 'walker' && roles.walker) || (b.for === 'owner' && roles.owner)
  return states
    .filter((s, i) => s.tier > 0 || relevant(BADGES[i]))
    .sort((a, b) => Number(b.tier > 0) - Number(a.tier > 0))
}

/** Each earned tier separately, so a new tier can be celebrated on its own. */
export function earnedTiers(badges: BadgeState[]): { key: string; tier: number }[] {
  return badges.flatMap((b) => Array.from({ length: b.tier }, (_, i) => ({ key: b.key, tier: i + 1 })))
}

/** Badge colours by tier: bronze, silver, gold, then green and ball yellow for the long haul. */
export function tierColor(tier: number): 'bronze' | 'silver' | 'gold' | 'green' | 'ball' {
  return (['bronze', 'silver', 'gold', 'green', 'ball'] as const)[Math.min(Math.max(tier, 1), 5) - 1]
}

// --- The week ---

export function walksInWeek(events: PointEvent[], now: Date): number {
  const week = weekOf(now)
  return events.filter((e) => e.kind === 'walk' && weekOf(e.at) === week).length
}

/** Walks per day this week, Monday first: a little calendar, not a streak. */
export function weekDays(events: PointEvent[], now: Date): number[] {
  const week = weekOf(now)
  const days = [0, 0, 0, 0, 0, 0, 0]
  for (const e of events) if (e.kind === 'walk' && weekOf(e.at) === week) days[localParts(e.at).weekday - 1]++
  return days
}

/** Weeks with at least one walk, ever. Only grows: a quiet week takes nothing away. */
export function activeWeeks(events: PointEvent[]): number {
  return new Set(events.filter((e) => e.kind === 'walk').map((e) => weekOf(e.at))).size
}

export const WEEKLY_GOALS = [1, 2, 3] as const

export function isWeeklyGoal(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7
}

// --- First steps ---

export interface StepFacts {
  about: boolean
  quiz: boolean
  /** Asked to meet or walk a dog at least once. */
  requested: boolean
  walks: number
  hasDog: boolean
  /** A walker met one of your dogs (a request was accepted). */
  dogMet: boolean
  dogWalks: number
  /** An owner's dog that is online while no request waits for an answer: the one to tell the neighbours about. */
  shareDog?: { id: string; name: string } | null
}

export type StepKey = 'account' | 'about' | 'dog' | 'quiz' | 'meet' | 'walk' | 'dogMet' | 'dogWalk'

export interface Step {
  key: StepKey
  done: boolean
  href: string
  /** Waiting for a first walker: the step is to tell the neighbours about this dog. */
  dog?: { id: string; name: string }
}

/** The first things to do, depending on why someone is here. The first step is already done. */
export function firstSteps(f: StepFacts, roles: Roles): Step[] {
  const steps: Step[] = [
    { key: 'account', done: true, href: '/profile' },
    { key: 'about', done: f.about, href: '/profile/edit' },
  ]
  if (roles.owner) steps.push({ key: 'dog', done: f.hasDog, href: '/my-dogs/new' })
  if (roles.walker || !roles.owner) {
    steps.push(
      { key: 'quiz', done: f.quiz, href: '/profile/quiz' },
      { key: 'meet', done: f.requested, href: '/dogs' },
      { key: 'walk', done: f.walks > 0, href: '/requests' },
    )
  } else {
    // Until a walker comes along, telling the neighbours about the dog is what an owner can do.
    const share = !f.dogMet && f.shareDog ? f.shareDog : null
    steps.push(
      share ? { key: 'dogMet', done: false, href: `/dogs/${share.id}#share`, dog: share } : { key: 'dogMet', done: f.dogMet, href: '/requests' },
      { key: 'dogWalk', done: f.dogWalks > 0, href: '/requests' },
    )
  }
  return steps
}

// --- Dog friends ("hondenvriendenboek") ---

/** How close a walker is with a dog, by walks together. The same steps as the iPhone app. */
export function bondFor(walks: number): 'met' | 'buddies' | 'good' | 'best' {
  if (walks < 2) return 'met'
  if (walks < 5) return 'buddies'
  if (walks < 10) return 'good'
  return 'best'
}

// --- Texts ---

/** Message key (under progress.earn and progress.recent) for each kind of points. */
export const KIND_KEYS: Record<PointKind, string> = {
  walk: 'walk',
  'walk-care': 'walkCare',
  'walk-photo': 'walkPhoto',
  feedback: 'feedback',
  'dog-walked': 'dogWalked',
  'group-walk': 'groupWalk',
  quiz: 'quiz',
  profile: 'profile',
  'first-dog': 'firstDog',
  invite: 'invite',
}

/** progress.recent key for a line in "recently earned": with the dog's name when it is known. */
export function recentKey(kind: string, dogName: string | null): string {
  const key = isPointKind(kind) ? KIND_KEYS[kind] : 'walk'
  if (key === 'walk' || key === 'dogWalked') return dogName ? key : `${key}Anon`
  return key
}

/** Points shown next to a first step. */
export const STEP_POINTS: Partial<Record<StepKey, number>> = {
  about: POINTS.profile,
  dog: POINTS['first-dog'],
  quiz: POINTS.quiz,
  walk: POINTS.walk,
  dogWalk: POINTS['dog-walked'],
}
