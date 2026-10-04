// "De beste vragen" of the marketing hub (/admin/marketing) without the database: the questions a
// growth lead asks at this stage (no real users yet → first shelter → first walk), each answered
// from plain rows. Pure functions, unit-tested in marketing-core.test.ts; src/server/marketing.ts
// feeds them real rows.
//
// Privacy: only counts, towns, shelter names (organisations) and the admin's own campaign codes
// leave this file. Never a member's name, e-mail address or personal code. Example data and the
// admins themselves never count.

import { citySlug } from '@/lib/cities'
import { nearness, NEAR_KM } from '@/lib/nearby'
import { tipKey } from '@/lib/tips'

const DAY = 24 * 60 * 60_000

// ---------- Rows ----------

/** Someone or something that may be example data, or an admin (both never count). */
interface Flags {
  demo: boolean
  admin?: boolean
}

export interface AccountRow extends Flags {
  id: string
  at: Date
  hasProfile: boolean
}

export interface MemberRow extends Flags {
  id: string
  at: Date
  walker: boolean
  owner: boolean
  banned: boolean
  country: string
  city: string
  lat: number | null
  lng: number | null
  referredBy: string | null
  referralCode: string
}

export interface DogRow extends Flags {
  id: string
  ownerId: string | null
  orgId: string | null
  /** active | paused | adopted | hidden | draft */
  status: string
  /** Bookable now: active, and for a shelter dog the shelter is verified. */
  live: boolean
  country: string
  city: string
  lat: number | null
  lng: number | null
}

export interface RequestRow extends Flags {
  walkerId: string
  ownerId: string | null
  /** pending | accepted | declined | cancelled | completed */
  status: string
  at: Date
}

export interface WalkRow extends Flags {
  walkerId: string
  dogId: string
  ownerId: string | null
  at: Date
}

export interface VoteRow extends Flags {
  voterId: string
  /** The directory id, or for a free-form tip country + tipKey(name). */
  key: string
  name: string
  city: string
  country: string
}

export interface GroupSignupRow extends Flags {
  userId: string
  status: string
}

export interface OrgRow extends Flags {
  createdBy: string | null
  status: string
}

export interface ContactRow {
  audience: string
  status: string
  organisation: string
}

export interface MarketingFacts {
  accounts: AccountRow[]
  members: MemberRow[]
  dogs: DogRow[]
  requests: RequestRow[]
  walks: WalkRow[]
  votes: VoteRow[]
  groupSignups: GroupSignupRow[]
  orgs: OrgRow[]
  contacts: ContactRow[]
  /** Referral codes of the admins: sign-ups through the admin's own flyer or link. */
  adminCodes: string[]
  /** "Vercel Web Analytics aanzetten" is ticked off in the launch hub. */
  analyticsOn: boolean
}

const real = <T extends Flags>(rows: T[]) => rows.filter((r) => !r.demo && !r.admin)

// ---------- Answers ----------

export const QUESTION_IDS = [
  'funnel',
  'newMembers',
  'demand',
  'wantedShelter',
  'shelterPipeline',
  'ownersDog',
  'walkersWaiting',
  'requests',
  'returning',
  'referrals',
  'traffic',
] as const

export type QuestionId = (typeof QUESTION_IDS)[number]

/** good: on track · watch: keep an eye on it · act: do something this week · wait: no data yet. */
export type Status = 'good' | 'watch' | 'act' | 'wait'

export interface AnswerRow {
  label: string
  value: number
  /** A second number (supply next to demand). */
  extra?: number
  href?: string
}

export interface Answer {
  id: QuestionId
  status: Status
  /** The answer text: marketing.questions.<id>.answer.<variant>. */
  variant: string
  /** The "wat nu" text: marketing.questions.<id>.action.<action>. */
  action: string
  values: Record<string, string | number>
  /** Values that are themselves message keys (marketing.labels.<key>), translated before use. */
  labels?: Record<string, string>
  href?: string
  rows?: AnswerRow[]
  /** The funnel's steps, in order. */
  steps?: { key: string; n: number }[]
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

/** 1 · Waar haken mensen af? Account → profiel af → eerste stap → eerste rondje. */
export function funnel(f: MarketingFacts): Answer {
  const accounts = real(f.accounts)
  const members = new Set(real(f.members).map((m) => m.id))
  const firstStep = new Set<string>([
    ...real(f.requests).map((r) => r.walkerId),
    ...real(f.groupSignups).map((s) => s.userId),
    ...real(f.dogs).filter((d) => d.ownerId && d.status !== 'draft').map((d) => d.ownerId!),
    ...real(f.orgs).filter((o) => o.createdBy && o.status !== 'rejected').map((o) => o.createdBy!),
  ])
  const firstWalk = new Set<string>([
    ...real(f.walks).flatMap((w) => [w.walkerId, ...(w.ownerId ? [w.ownerId] : [])]),
    ...real(f.groupSignups).filter((s) => s.status === 'attended').map((s) => s.userId),
  ])
  const steps = [
    { key: 'account', n: accounts.length },
    { key: 'profile', n: accounts.filter((a) => a.hasProfile && members.has(a.id)).length },
    { key: 'firstStep', n: [...firstStep].filter((id) => members.has(id)).length },
    { key: 'firstWalk', n: [...firstWalk].filter((id) => members.has(id)).length },
  ]
  if (!steps[0].n) return { id: 'funnel', status: 'wait', variant: 'empty', action: 'empty', values: {}, steps }

  // The biggest leak: the step where most people stay behind (with few people, a share says
  // little: 0 of 1 is not a bigger problem than 1 of 6). On a tie, the smallest share.
  const lost = (i: number) => steps[i - 1].n - steps[i].n
  const ratio = (i: number) => (steps[i - 1].n ? steps[i].n / steps[i - 1].n : 1)
  let worst = 1
  for (let i = 2; i < steps.length; i++) if (lost(i) > lost(worst) || (lost(i) === lost(worst) && ratio(i) < ratio(worst))) worst = i
  const share = pct(steps[worst].n, steps[worst - 1].n)
  const allGood = steps.slice(1).every((s, i) => pct(s.n, steps[i].n) >= 50) && steps[3].n > 0
  return {
    id: 'funnel',
    status: allGood ? 'good' : share < 50 ? 'act' : 'watch',
    variant: 'drop',
    action: steps[worst].key,
    values: { pct: share, accounts: steps[0].n },
    labels: { from: `step.${steps[worst - 1].key}`, to: `step.${steps[worst].key}` },
    steps,
  }
}

/** 2 · Hoeveel nieuwe leden deze week, tegen vorige week? */
export function newMembers(f: MarketingFacts, now: Date): Answer {
  const members = real(f.members)
  const since = (days: number) => now.getTime() - days * DAY
  const thisWeek = members.filter((m) => m.at.getTime() > since(7) && m.at.getTime() <= now.getTime() + DAY)
  const lastWeek = members.filter((m) => m.at.getTime() > since(14) && m.at.getTime() <= since(7)).length
  const values = {
    thisWeek: thisWeek.length,
    lastWeek,
    walkers: thisWeek.filter((m) => m.walker).length,
    owners: thisWeek.filter((m) => m.owner).length,
    total: members.length,
  }
  if (!values.thisWeek && !lastWeek) return { id: 'newMembers', status: members.length ? 'act' : 'wait', variant: 'none', action: 'start', values }
  if (values.thisWeek > lastWeek) return { id: 'newMembers', status: 'good', variant: 'up', action: 'repeat', values }
  return { id: 'newMembers', status: values.thisWeek ? 'watch' : 'act', variant: values.thisWeek === lastWeek ? 'same' : 'down', action: 'push', values }
}

interface Town {
  town: string
  city: string
  country: string
}

/** 3 · In welke stad is de meeste vraag (wandelaars, stemmen) en het minste aanbod (honden)? */
export function demand(f: MarketingFacts): Answer {
  const towns = new Map<string, Town & { people: Set<string>; dogs: number }>()
  const at = (city: string, country: string) => {
    const town = citySlug(city)
    const key = `${country}:${town}`
    if (!towns.has(key)) towns.set(key, { town, city, country, people: new Set(), dogs: 0 })
    return towns.get(key)!
  }
  const members = real(f.members).filter((m) => !m.banned)
  for (const m of members) if (m.walker && m.city.trim()) at(m.city, m.country).people.add(m.id)
  for (const v of real(f.votes)) if (v.city.trim()) at(v.city, v.country).people.add(v.voterId)
  const liveDogs = real(f.dogs).filter((d) => d.live)
  for (const d of liveDogs) if (d.city.trim()) at(d.city, d.country).dogs++

  const rows = [...towns.values()]
    .filter((t) => t.people.size > 0)
    .sort((a, b) => b.people.size - b.dogs - (a.people.size - a.dogs) || b.people.size - a.people.size || a.city.localeCompare(b.city))
  const walkers = members.filter((m) => m.walker).length
  if (!rows.length) return { id: 'demand', status: 'wait', variant: 'empty', action: 'votes', values: { dogs: liveDogs.length }, href: '/shelters' }

  const top = rows[0]
  const values = { city: top.city, demand: top.people.size, supply: top.dogs, walkers, dogs: liveDogs.length }
  const status: Status = top.dogs === 0 ? 'act' : top.people.size > top.dogs * 2 ? 'watch' : 'good'
  return {
    id: 'demand',
    status,
    variant: 'gap',
    action: status === 'good' ? 'balanced' : 'supply',
    values,
    href: `/cities/${top.town}`,
    rows: rows.slice(0, 4).map((t) => ({ label: t.city, value: t.people.size, extra: t.dogs, href: `/cities/${t.town}` })),
  }
}

/** 4 · Welke opvang krijgt de meeste "Ik wil hier wandelen"-stemmen (= wie mail je eerst)? */
export function wantedShelter(f: MarketingFacts): Answer {
  const groups = new Map<string, { name: string; city: string; voters: Set<string> }>()
  for (const v of real(f.votes)) {
    const group = groups.get(v.key) ?? { name: v.name, city: v.city, voters: new Set<string>() }
    group.voters.add(v.voterId)
    groups.set(v.key, group)
  }
  const ranked = [...groups.values()].sort((a, b) => b.voters.size - a.voters.size || a.name.localeCompare(b.name))
  if (!ranked.length) return { id: 'wantedShelter', status: 'wait', variant: 'none', action: 'share', values: {}, href: '/shelters' }

  const contacted = new Set(
    f.contacts.filter((c) => c.audience === 'shelter' && c.status !== 'todo').map((c) => tipKey(c.organisation)),
  )
  const top = ranked[0]
  const reached = contacted.has(tipKey(top.name))
  return {
    id: 'wantedShelter',
    status: reached ? 'watch' : 'act',
    variant: 'top',
    action: reached ? 'follow' : 'mail',
    values: { name: top.name, city: top.city, n: top.voters.size },
    href: '/admin/launch#berichten',
    rows: ranked.slice(0, 3).map((g) => ({ label: g.city ? `${g.name} · ${g.city}` : g.name, value: g.voters.size })),
  }
}

/** 5 · Hoe staat de opvang-pijplijn: benaderd → antwoord → gesprek → live? */
export function shelterPipeline(f: MarketingFacts): Answer {
  const shelters = f.contacts.filter((c) => c.audience === 'shelter')
  const orgs = real(f.orgs)
  const values = {
    todo: shelters.filter((c) => c.status === 'todo').length,
    sent: shelters.filter((c) => c.status !== 'todo').length,
    replied: shelters.filter((c) => c.status === 'replied' || c.status === 'meeting').length,
    meeting: shelters.filter((c) => c.status === 'meeting').length,
    live: orgs.filter((o) => o.status === 'verified').length,
    pending: orgs.filter((o) => o.status === 'pending').length,
    missing: Math.max(0, 10 - shelters.filter((c) => c.status !== 'todo').length),
  }
  const base = { id: 'shelterPipeline' as const, variant: 'counts', values }
  if (values.pending) return { ...base, status: 'act', action: 'review', href: '/admin' }
  if (values.live) return { ...base, status: 'good', action: 'firstWalk' }
  if (values.meeting) return { ...base, status: 'watch', action: 'onboard' }
  if (values.missing) return { ...base, status: 'act', action: 'send', href: '/admin/launch#berichten' }
  return { ...base, status: 'watch', action: 'call', href: '/admin/launch#berichten' }
}

/** 6 · Zetten eigenaren die zich aanmelden ook echt een hond online? */
export function ownersDog(f: MarketingFacts): Answer {
  const owners = real(f.members).filter((m) => m.owner && !m.banned)
  if (!owners.length) return { id: 'ownersDog', status: 'wait', variant: 'none', action: 'recruit', values: {}, href: '/flyer?for=owner' }
  const online = new Set(real(f.dogs).filter((d) => d.ownerId && d.status === 'active').map((d) => d.ownerId))
  const withDog = owners.filter((o) => online.has(o.id)).length
  const share = pct(withDog, owners.length)
  return {
    id: 'ownersDog',
    status: share >= 70 ? 'good' : 'act',
    variant: 'share',
    action: share >= 70 ? 'keep' : 'help',
    values: { withDog, owners: owners.length, without: owners.length - withDog, pct: share },
    href: share >= 70 ? undefined : '/my-dogs/new',
  }
}

/** 7 · Wachten wandelaars op een hond bij hen in de buurt? */
export function walkersWaiting(f: MarketingFacts): Answer {
  const walkers = real(f.members).filter((m) => m.walker && !m.banned)
  if (!walkers.length) return { id: 'walkersWaiting', status: 'wait', variant: 'none', action: 'recruit', values: { km: NEAR_KM }, href: '/flyer?for=walker' }
  const dogs = real(f.dogs).filter((d) => d.live)
  const place = (p: { country: string; city: string; lat: number | null; lng: number | null }) => ({ country: p.country, town: citySlug(p.city), lat: p.lat, lng: p.lng })
  const waiting = walkers.filter((w) => !dogs.some((d) => nearness(place(w), place(d)) != null))
  const byTown = new Map<string, { city: string; n: number }>()
  for (const w of waiting) {
    const key = `${w.country}:${citySlug(w.city)}`
    byTown.set(key, { city: w.city, n: (byTown.get(key)?.n ?? 0) + 1 })
  }
  const top = [...byTown.values()].sort((a, b) => b.n - a.n || a.city.localeCompare(b.city))[0]
  const values = { waiting: waiting.length, walkers: walkers.length, km: NEAR_KM, city: top?.city ?? '' }
  if (!waiting.length) return { id: 'walkersWaiting', status: 'good', variant: 'served', action: 'keep', values }
  return {
    id: 'walkersWaiting',
    status: waiting.length * 2 > walkers.length ? 'act' : 'watch',
    variant: 'waiting',
    action: 'supply',
    values,
    href: '/suggest',
  }
}

/** 8 · Krijgen aanvragen op tijd antwoord? */
export function requests(f: MarketingFacts, now: Date): Answer {
  const rows = real(f.requests)
  if (!rows.length) return { id: 'requests', status: 'wait', variant: 'none', action: 'supplyFirst', values: {} }
  const stale = rows.filter((r) => r.status === 'pending' && now.getTime() - r.at.getTime() > 2 * DAY).length
  const values = {
    total: rows.length,
    accepted: rows.filter((r) => r.status === 'accepted' || r.status === 'completed').length,
    pending: rows.filter((r) => r.status === 'pending').length,
    stale,
  }
  return { id: 'requests', status: stale ? 'act' : 'good', variant: 'counts', action: stale ? 'chase' : 'keep', values }
}

/** 9 · Komen wandelaars terug na hun eerste rondje? */
export function returning(f: MarketingFacts, now: Date): Answer {
  const walks = real(f.walks)
  if (!walks.length) return { id: 'returning', status: 'wait', variant: 'none', action: 'firstWalk', values: {} }
  const perWalker = new Map<string, number>()
  const perPair = new Map<string, number>()
  const since = now.getTime() - 56 * DAY
  for (const w of walks) {
    perWalker.set(w.walkerId, (perWalker.get(w.walkerId) ?? 0) + 1)
    if (w.at.getTime() >= since) perPair.set(`${w.walkerId}:${w.dogId}`, (perPair.get(`${w.walkerId}:${w.dogId}`) ?? 0) + 1)
  }
  const once = perWalker.size
  const again = [...perWalker.values()].filter((n) => n >= 2).length
  const steady = [...perPair.values()].filter((n) => n >= 3).length
  const good = again * 2 >= once
  return { id: 'returning', status: good ? 'good' : 'act', variant: 'counts', action: good ? 'keep' : 'ask', values: { once, again, steady, pct: pct(again, once) } }
}

/** 10 · Werken uitnodigingslinks en codes (aanmeldingen per link)? */
export function referrals(f: MarketingFacts): Answer {
  const members = real(f.members)
  if (!members.length) return { id: 'referrals', status: 'wait', variant: 'none', action: 'codes', values: {}, href: '#links' }
  const admin = new Set(f.adminCodes.map((c) => c.toUpperCase()))
  const personal = new Set(f.members.map((m) => m.referralCode.toUpperCase()))
  const campaign = new Map<string, number>()
  let own = 0
  let viaMembers = 0
  for (const m of members) {
    const code = m.referredBy?.toUpperCase()
    if (!code) continue
    if (admin.has(code)) own++
    else if (personal.has(code)) viaMembers++
    else campaign.set(code, (campaign.get(code) ?? 0) + 1)
  }
  const viaCodes = [...campaign.values()].reduce((a, b) => a + b, 0)
  const referred = own + viaMembers + viaCodes
  const share = pct(referred, members.length)
  return {
    id: 'referrals',
    status: share >= 20 ? 'good' : 'watch',
    variant: 'counts',
    action: share >= 20 ? 'more' : 'codes',
    values: { referred, members: members.length, pct: share, own, viaMembers, viaCodes },
    href: '#links',
    // Only the admin's own campaign codes are listed: members' personal codes are never shown.
    rows: [...campaign.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([code, n]) => ({ label: code, value: n })),
  }
}

/** 11 · Welke pagina's en campagnes brengen bezoekers? (Vercel Web Analytics) */
export function traffic(f: MarketingFacts): Answer {
  return f.analyticsOn
    ? { id: 'traffic', status: 'watch', variant: 'on', action: 'check', values: {}, href: 'https://vercel.com/dashboard' }
    : { id: 'traffic', status: 'act', variant: 'off', action: 'enable', values: {}, href: 'https://vercel.com/dashboard' }
}

export function answers(f: MarketingFacts, now: Date): Answer[] {
  return [
    funnel(f),
    newMembers(f, now),
    demand(f),
    wantedShelter(f),
    shelterPipeline(f),
    ownersDog(f),
    walkersWaiting(f),
    requests(f, now),
    returning(f, now),
    referrals(f),
    traffic(f),
  ]
}

/** "Deze week": the first questions that ask for action, in the order of the list (that order is the path). */
export function thisWeek(list: Answer[], max = 3): Answer[] {
  return list.filter((a) => a.status === 'act').slice(0, max)
}
