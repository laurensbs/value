// Safety rules of the platform. Pure functions, enforced on the server and unit-tested.

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
  | 'needs-solo-trust'
  | 'needs-in-person'
  | 'meet-via'
  | 'experience'

export interface WalkerFacts {
  userId: string
  onboarded: boolean
  banned: boolean
  birthDate: string | null
  quizPassed: boolean
  pppLicense: boolean
  experience: 'none' | 'some' | 'lots'
  pendingRequests: number
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

/** A first meeting (kennismaking): the owner or shelter staff is present. */
export function canRequestMeeting(w: WalkerFacts, d: DogFacts, r: Relation): Reason | null {
  const base = baseChecks(w, d, r)
  if (base) return base
  if (w.pendingRequests >= MAX_PENDING_REQUESTS) return 'too-many-pending'
  return null
}

/** A solo walk: only after the owner granted it for this dog, and after the safety quiz. */
export function canRequestSolo(w: WalkerFacts, d: DogFacts, r: Relation): Reason | null {
  const base = baseChecks(w, d, r)
  if (base) return base
  if (d.orgId) return 'needs-meeting'
  if (!r.soloAllowed) return 'needs-solo-trust'
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
 * Recording "ID seen in person" and allowing solo walks need a meeting in person: an accepted walk or
 * home visit, or a walk together. A phone or video call never counts, however it went.
 */
export function canRecordTrust(requests: { status: string; meetVia: string }[], walks: number): Reason | null {
  if (walks > 0) return null
  const met = requests.filter((r) => r.status === 'accepted' || r.status === 'completed')
  if (met.some((r) => isInPerson(r.meetVia))) return null
  return met.length ? 'needs-in-person' : 'needs-meeting'
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

/** Minutes past the planned end (beyond a grace period), or 0. */
export function overdueMinutes(plannedEndAt: Date, now = new Date()): number {
  const over = (now.getTime() - plannedEndAt.getTime()) / 60_000 - OVERDUE_GRACE_MIN
  return over > 0 ? Math.floor(over) : 0
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
