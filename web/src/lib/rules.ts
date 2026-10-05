// Safety rules of the platform. Pure functions, enforced on the server and unit-tested.

import { TERMS_EFFECTIVE_AT, TERMS_VERSION } from './site'
import { zonedToUtc } from './time'

export const MIN_AGE = 18
export const MAX_PENDING_REQUESTS = 5
export const OVERDUE_GRACE_MIN = 20
export const ROUTE_RETENTION_DAYS = 30
/** Chat messages are kept for a year, then deleted. */
export const CHAT_RETENTION_DAYS = 365
/** A walk can be started from this long before its planned start … */
export const START_WINDOW_BEFORE_MIN = 30
/** … until this long after it. */
export const START_WINDOW_AFTER_MIN = 120

export type Reason =
  | 'not-onboarded'
  | 'banned'
  | 'too-young'
  | 'own-dog'
  | 'dog-unavailable'
  | 'demo-dog'
  | 'blocked'
  | 'too-many-pending'
  | 'ppp-licence'
  | 'needs-meeting'
  | 'needs-quiz'
  // The terms changed and have taken effect: agree to the new ones first (art. 19).
  | 'needs-terms'
  // Live location is switched off (LIVE_LOCATION): a walk alone with the dog cannot start.
  | 'live-location-off'
  | 'needs-solo-trust'
  | 'needs-in-person'
  | 'meet-via'
  | 'experience'
  | 'needs-id'
  | 'already-open'
  // For the owner or shelter: what they tried does not fit the trust given so far.
  | 'solo-not-allowed'
  | 'id-not-seen'
  | 'meeting-ahead'

export interface WalkerFacts {
  userId: string
  onboarded: boolean
  banned: boolean
  birthDate: string | null
  quizPassed: boolean
  pppLicense: boolean
  experience: 'none' | 'some' | 'lots'
  pendingRequests: number
  /** The terms changed, took effect, and this person has not agreed to the new ones yet (termsReason). */
  needsTerms: boolean
}

export interface DogFacts {
  ownerId: string | null
  orgId: string | null
  country: string
  status: string
  isDemo: boolean
  ppp: boolean
  level: 'starter' | 'experienced'
}

export interface Relation {
  /** The walker belongs to the shelter that owns this dog. */
  isStaff: boolean
  blocked: boolean
  /** The owner granted solo walks with this dog. */
  soloAllowed: boolean
  /** The owner (or shelter) saw the walker's ID in person. Needed before any solo walk (besluit 4 okt 2026). */
  idSeen: boolean
}

/** Age in whole years on `now`, from an ISO date (YYYY-MM-DD). */
export function ageOn(birthDate: string, now = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number)
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  return age
}

export function isAdult(birthDate: string | null, now = new Date()): boolean {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false
  return ageOn(birthDate, now) >= MIN_AGE
}

/** Shown publicly instead of an exact age. */
export function ageBand(birthDate: string, now = new Date()): '18-24' | '25-34' | '35-49' | '50+' {
  const age = ageOn(birthDate, now)
  if (age < 25) return '18-24'
  if (age < 35) return '25-34'
  if (age < 50) return '35-49'
  return '50+'
}

function baseChecks(w: WalkerFacts, d: DogFacts, r: Relation): Reason | null {
  if (!w.onboarded) return 'not-onboarded'
  if (w.banned) return 'banned'
  if (!isAdult(w.birthDate)) return 'too-young'
  if (d.ownerId === w.userId || r.isStaff) return 'own-dog'
  if (d.isDemo) return 'demo-dog'
  if (d.status !== 'active') return 'dog-unavailable'
  if (r.blocked) return 'blocked'
  if (d.country === 'ES' && d.ppp && !w.pppLicense) return 'ppp-licence'
  return null
}

/**
 * A first meeting (kennismaking): the owner or shelter staff is present. Walkers do the safety quiz
 * first (besluit 4 okt 2026); owners and shelter staff never ask for their own dog (baseChecks).
 */
export function canRequestMeeting(w: WalkerFacts, d: DogFacts, r: Relation): Reason | null {
  const base = baseChecks(w, d, r)
  if (base) return base
  if (w.needsTerms) return 'needs-terms'
  if (!w.quizPassed) return 'needs-quiz'
  if (w.pendingRequests >= MAX_PENDING_REQUESTS) return 'too-many-pending'
  return null
}

/**
 * Whether a solo walk may happen, from the trust stored for this walker and dog: asked for, accepted,
 * started or rolled on to next week. Never with a shelter dog, never without the owner's yes, and
 * never without the ID seen in person. Anything that is not a solo walk is not about trust.
 */
export function soloTrustReason(
  kind: string,
  dog: Pick<DogFacts, 'orgId'>,
  grant: { soloAllowed: boolean; idSeen: boolean } | null | undefined,
): Reason | null {
  if (kind !== 'solo') return null
  if (dog.orgId || !grant?.soloAllowed) return 'needs-solo-trust'
  if (!grant.idSeen) return 'needs-id'
  return null
}

/** The same reasons, said to the owner or shelter who decides (accepting a solo walk, saving trust). */
export function forDecider(reason: Reason): Reason {
  return reason === 'needs-solo-trust' ? 'solo-not-allowed' : reason === 'needs-id' ? 'id-not-seen' : reason
}

/** A solo walk: only after the owner granted it for this dog, and after the safety quiz. */
export function canRequestSolo(w: WalkerFacts, d: DogFacts, r: Relation): Reason | null {
  const base = baseChecks(w, d, r)
  if (base) return base
  if (d.orgId) return 'needs-meeting'
  if (!r.soloAllowed) return 'needs-solo-trust'
  if (!r.idSeen) return 'needs-id'
  if (w.needsTerms) return 'needs-terms'
  if (!w.quizPassed) return 'needs-quiz'
  if (d.level === 'experienced' && w.experience === 'none') return 'experience'
  if (w.pendingRequests >= MAX_PENDING_REQUESTS) return 'too-many-pending'
  return null
}

// --- How a first meeting (kennismaking) happens ---

/**
 * Ways to get to know each other: walking together or a visit at the owner's home (both in person),
 * or first a phone or video call. Only a first meeting can be a visit or a call; a walk is a walk.
 */
export const MEET_VIAS = ['walk', 'home', 'phone', 'video'] as const
export type MeetVia = (typeof MEET_VIAS)[number]

export function isMeetVia(value: unknown): value is MeetVia {
  return typeof value === 'string' && (MEET_VIAS as readonly string[]).includes(value)
}

/**
 * Walker, owner and dog in the same place: only then can the owner see the walker's ID. Anything
 * else (a call, or an unknown value) is not in person.
 */
export function isInPerson(meetVia: string): boolean {
  return meetVia === 'walk' || meetVia === 'home'
}

/**
 * The ways a request may take. A private owner chooses from all four for a first meeting. A shelter
 * meets on its own location, during a walk; a solo walk is always a walk.
 */
export function meetViaOptions(kind: string, dog: Pick<DogFacts, 'orgId'>): MeetVia[] {
  if (kind !== 'meet' || dog.orgId) return ['walk']
  return [...MEET_VIAS]
}

export function checkMeetVia(kind: string, meetVia: string, dog: Pick<DogFacts, 'orgId'>): Reason | null {
  return (meetViaOptions(kind, dog) as string[]).includes(meetVia) ? null : 'meet-via'
}

/**
 * Recording "ID seen in person" and allowing solo walks need a meeting in person that took place: an
 * accepted walk or home visit whose moment has come, or a walk together. A phone or video call never
 * counts, however it went; a meeting that is still to come does not count yet.
 */
export function canRecordTrust(requests: { status: string; meetVia: string; startsAt: Date }[], walks: number, now = new Date()): Reason | null {
  if (walks > 0) return null
  const agreed = requests.filter((r) => r.status === 'accepted' || r.status === 'completed')
  const inPerson = agreed.filter((r) => isInPerson(r.meetVia))
  if (inPerson.some((r) => r.status === 'completed' || r.startsAt.getTime() <= now.getTime())) return null
  if (inPerson.length) return 'meeting-ahead'
  return agreed.length ? 'needs-in-person' : 'needs-meeting'
}

/** Solo walks only with an ID seen in person: an owner cannot allow one without the other. */
export function checkTrust(input: { idSeen: boolean; soloAllowed: boolean }): Reason | null {
  return input.soloAllowed && !input.idSeen ? 'needs-id' : null
}

/**
 * The open request a new one would duplicate: the same walker and dog, waiting for an answer or
 * agreed, and not in the past. Two exceptions: an agreed first call is followed by planning to meet in
 * person (createRequest closes the call once that is asked for), and an agreed weekly solo walk leaves
 * room for an extra solo walk on another day.
 */
export function openRequestConflict<T extends { status: string; startsAt: Date; meetVia: string; kind: string; weekly: boolean }>(
  existing: T[],
  next: { kind: string; meetVia: string },
  now = new Date(),
): T | null {
  return (
    existing.find(
      (e) =>
        (e.status === 'pending' || e.status === 'accepted') &&
        e.startsAt.getTime() > now.getTime() &&
        !(e.status === 'accepted' && !isInPerson(e.meetVia) && next.kind === 'meet' && isInPerson(next.meetVia)) &&
        !(e.status === 'accepted' && e.kind === 'solo' && e.weekly && next.kind === 'solo'),
    ) ?? null
  )
}

/** A walk (with live location) only starts from an accepted walk or visit in person, never from a call. */
export function canStartWalk(
  request: { status: string; startsAt: Date; walkerId: string; meetVia: string },
  userId: string,
  now = new Date(),
): boolean {
  if (request.status !== 'accepted' || request.walkerId !== userId) return false
  if (!isInPerson(request.meetVia)) return false
  const diffMin = (now.getTime() - request.startsAt.getTime()) / 60_000
  return diffMin >= -START_WINDOW_BEFORE_MIN && diffMin <= START_WINDOW_AFTER_MIN
}

/**
 * Live location can be switched off for everyone (LIVE_LOCATION, lib/live-location.ts). A walk where
 * the owner or shelter is there, the first meeting (terms art. 6.3), can still start and end: the
 * timer, the report and the photos work without location. A walk alone with the dog cannot start, because
 * the live map is how the owner follows it and finds the walker when something is wrong (safety
 * protocol art. 2 and 3.5). Ending a walk is always possible.
 */
export function liveLocationReason(kind: string, liveLocation: boolean): Reason | null {
  return kind === 'solo' && !liveLocation ? 'live-location-off' : null
}

/** Minutes past the planned end (beyond a grace period), or 0. */
export function overdueMinutes(plannedEndAt: Date, now = new Date()): number {
  const over = (now.getTime() - plannedEndAt.getTime()) / 60_000 - OVERDUE_GRACE_MIN
  return over > 0 ? Math.floor(over) : 0
}

// --- Changed terms (terms art. 19) ---

/**
 * Orders two terms versions: "0.2" < "0.3" < "0.10" < "1". Anything that is not a version number
 * (the example accounts have "demo") comes before every real version.
 */
export function compareTermsVersions(a: string, b: string): number {
  const parse = (v: string) => (/^\d+(\.\d+)*$/.test(v.trim()) ? v.trim().split('.').map(Number) : null)
  const x = parse(a)
  const y = parse(b)
  if (!x || !y) return x ? 1 : y ? -1 : 0
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0)
    if (diff) return Math.sign(diff)
  }
  return 0
}

/** Someone agreed to an older version than the current terms (or to none we know): they see what changed. */
export function termsOutdated(accepted: string | null | undefined, current = TERMS_VERSION): boolean {
  return !accepted || compareTermsVersions(accepted, current) < 0
}

/** The moment TERMS_EFFECTIVE_AT starts: 00:00 in Amsterdam. */
export function termsEffectiveAt(day = TERMS_EFFECTIVE_AT): Date {
  return zonedToUtc(day, '00:00')
}

/**
 * Changed terms bind nobody before they take effect (art. 19: announced at least 30 days ahead). Until
 * then everything works as before, with a calm notice. From that day on, someone who has not agreed yet
 * agrees first, before anything new that commits them or someone else: asking for a meeting or a walk,
 * accepting one, starting a walk, joining a group walk. Declining, cancelling and ending stay possible.
 */
export function termsReason(
  accepted: string | null | undefined,
  now = new Date(),
  terms: { version: string; effectiveAt: Date } = { version: TERMS_VERSION, effectiveAt: termsEffectiveAt() },
): Reason | null {
  return termsOutdated(accepted, terms.version) && now.getTime() >= terms.effectiveAt.getTime() ? 'needs-terms' : null
}

// --- Risky content in free text (scams, moving off-platform too early) ---

export type TextFlag = 'money' | 'iban' | 'link' | 'phone' | 'email'

const MONEY_WORDS = [
  // nl
  'betaal', 'betalen', 'geld', 'tikkie', 'voorschot', 'borg', 'overmaken',
  // en
  'payment', 'pay me', 'deposit', 'transfer', 'paypal', 'western union', 'gift card',
  // es
  'pago', 'pagar', 'dinero', 'transferencia', 'bizum', 'fianza',
  // fr
  'paiement', 'payer', 'argent', 'virement', 'caution',
]

export function scanText(text: string): TextFlag[] {
  const t = text.toLowerCase()
  const flags = new Set<TextFlag>()
  if (MONEY_WORDS.some((w) => t.includes(w)) || /[€$£]\s?\d|\d\s?(euro|eur)\b/.test(t)) flags.add('money')
  if (/\b[a-z]{2}\d{2}(?:\s?[a-z0-9]{4}){2,7}\b/i.test(text)) flags.add('iban')
  if (/(https?:\/\/|www\.)\S+/i.test(text)) flags.add('link')
  if (/(\+\d{2}|\b0)[\d\s-]{8,}\d/.test(text)) flags.add('phone')
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) flags.add('email')
  return [...flags]
}

/** Flags in a chat message that get a warning for the other person and a line in the audit log. */
export const CHAT_WARN_FLAGS: readonly string[] = ['money', 'iban', 'link'] satisfies TextFlag[]

// --- Private feedback after a walk ---

export interface OwnerFeedback {
  dogCondition: 'happy' | 'normal' | 'stressed' | 'injured'
  onTime: boolean
  wouldAgain: boolean
}

export interface WalkerFeedback {
  dogBehaviour: 'easy' | 'pulled' | 'reactive' | 'aggressive'
  handoverOk: boolean
  feltSafe: boolean
}

/** Answers that a moderator should look at. */
export function feedbackNeedsReview(role: 'owner' | 'walker', answers: OwnerFeedback | WalkerFeedback): boolean {
  if (role === 'owner') {
    const a = answers as OwnerFeedback
    return a.dogCondition === 'injured' || a.dogCondition === 'stressed' || !a.wouldAgain
  }
  const a = answers as WalkerFeedback
  return a.dogBehaviour === 'aggressive' || !a.feltSafe || !a.handoverOk
}

// --- Public trust signals (no stars, no public reviews) ---

export interface TrustSignals {
  walks: number
  idChecks: number
  quizPassed: boolean
  memberSinceYear: number
}

export type TrustBadge = 'new' | 'id-seen' | 'quiz' | 'regular'

export function trustBadges(s: TrustSignals): TrustBadge[] {
  const badges: TrustBadge[] = []
  if (s.walks === 0 && s.idChecks === 0) badges.push('new')
  if (s.idChecks > 0) badges.push('id-seen')
  if (s.quizPassed) badges.push('quiz')
  if (s.walks >= 10) badges.push('regular')
  return badges
}
