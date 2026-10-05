// "Bronnen" in Beheer (/admin/sources) without the database: where new people came from, per ISO
// week, split by role, plus the new real dogs. Pure functions, unit-tested in sources-core.test.ts;
// src/server/sources.ts feeds them real rows.
//
// Privacy: only counts and the admin's own campaign codes (INSTAGRAM, WHYDONATE …) leave this file.
// A member's personal invite code is never shown: those sign-ups are grouped as 'invite'. Example
// data and the admins themselves never count.

import { cleanInviteCode } from '@/lib/invite'
import { toZonedParts } from '@/lib/time'
import { weekStarts } from './launch-core'

/** How many weeks the page shows, the current week included. */
export const SOURCE_WEEKS = 8

export const ROLES = ['walker', 'owner', 'shelter'] as const
export type Role = (typeof ROLES)[number]

/** No code at all (typed the address, a search engine, the app store). */
export const DIRECT = 'direct'
/** Someone's personal invite link (/r/ABC234): the code itself stays private. */
export const INVITE = 'invite'

/** One finished sign-up (a profile), with the role as it is in the profile now. */
export interface SignupRow {
  at: Date
  referredBy: string | null
  wantsToWalk: boolean
  hasDogs: boolean
  /** Works at a shelter on Rondje (a member of a real organisation). */
  shelterMember: boolean
  demo: boolean
  admin: boolean
}

/** A dog that was put online (drafts are left out before this). */
export interface NewDogRow {
  at: Date
  demo: boolean
  admin: boolean
}

export type RoleCounts = Record<Role | 'total', number>

export interface SourceCount {
  /** DIRECT, INVITE, or a campaign code like 'INSTAGRAM'. */
  key: string
  counts: RoleCounts
}

export interface WeekReport {
  /** Monday 00:00 in Amsterdam, as a UTC instant. */
  start: Date
  /** Sunday of that week, at noon (for a date range label). */
  end: Date
  isoYear: number
  isoWeek: number
  signups: RoleCounts
  /** Sources with at least one sign-up that week, most first. */
  sources: SourceCount[]
  dogs: number
}

export interface SourcesReport {
  /** Oldest first, the current week last. */
  weeks: WeekReport[]
  /** All weeks together, per source, most first. */
  bySource: SourceCount[]
  totals: RoleCounts
  dogs: number
}

const DAY = 24 * 60 * 60_000

/**
 * A personal referral code: six characters from the alphabet profiles get (profile-core.ts, no I,
 * O, 0 or 1). Campaign codes are at least seven characters (sourceCode in lib/join.ts and
 * suggestCode in the campaign builder pad them), so a code like this whose member has since left
 * is still someone's own code, and stays private.
 */
const PERSONAL = /^[A-HJ-NP-Z2-9]{6}$/

/**
 * Where a sign-up came from: DIRECT without a code, INVITE for a member's own code (also one whose
 * member has left), otherwise the campaign code itself, cleaned like an invite link cleans it.
 */
export function sourceOf(referredBy: string | null | undefined, memberCodes: ReadonlySet<string>): string {
  const code = cleanInviteCode(referredBy ?? '')
  if (!code) return DIRECT
  if (memberCodes.has(code) || PERSONAL.test(code)) return INVITE
  return code
}

/**
 * The roles someone signed up with, as the profile says now. Walking and having a dog can go
 * together ("Allebei"), so one person can count in both. A shelter: someone at a real organisation,
 * or who chose "Ik werk bij een opvang" in onboarding (neither walking nor a dog of their own).
 */
export function rolesOf(row: Pick<SignupRow, 'wantsToWalk' | 'hasDogs' | 'shelterMember'>): Role[] {
  const roles: Role[] = []
  if (row.wantsToWalk) roles.push('walker')
  if (row.hasDogs) roles.push('owner')
  if (row.shelterMember || (!row.wantsToWalk && !row.hasDogs)) roles.push('shelter')
  return roles
}

/** ISO 8601 week number and week-year of a calendar date (YYYY-MM-DD). */
export function isoWeek(date: string): { year: number; week: number } {
  const d = new Date(`${date}T12:00:00Z`)
  // The Thursday of the same week decides the year (and so week 1 holds the 4th of January).
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
  const year = d.getUTCFullYear()
  const jan4 = new Date(Date.UTC(year, 0, 4, 12))
  const firstThursday = new Date(jan4)
  firstThursday.setUTCDate(jan4.getUTCDate() + 3 - ((jan4.getUTCDay() + 6) % 7))
  return { year, week: 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * DAY)) }
}

const empty = (): RoleCounts => ({ walker: 0, owner: 0, shelter: 0, total: 0 })

function add(counts: RoleCounts, roles: Role[]) {
  counts.total++
  for (const role of roles) counts[role]++
}

/** The week a moment falls in: -1 before the first week; anything after the last start counts in the last week. */
function weekIndex(at: Date, starts: Date[]): number {
  const t = at.getTime()
  for (let i = starts.length - 1; i >= 0; i--) if (t >= starts[i].getTime()) return i
  return -1
}

/** Most sign-ups first; DIRECT and INVITE before codes with as many, then codes A–Z. */
function sorted(map: Map<string, RoleCounts>): SourceCount[] {
  const rank = (key: string) => (key === DIRECT ? 0 : key === INVITE ? 1 : 2)
  return [...map.entries()]
    .map(([key, counts]) => ({ key, counts }))
    .sort((a, b) => b.counts.total - a.counts.total || rank(a.key) - rank(b.key) || a.key.localeCompare(b.key))
}

/**
 * Sign-ups per source and role, and new dogs, for each of the last `weeks` weeks (Monday to
 * Sunday, Amsterdam time). Example data and admins are left out; rows before the first week too.
 */
export function sourcesReport(signups: SignupRow[], dogs: NewDogRow[], memberCodes: ReadonlySet<string>, now: Date, weeks = SOURCE_WEEKS): SourcesReport {
  const starts = weekStarts(now, weeks)
  const perWeek = starts.map(() => ({ signups: empty(), sources: new Map<string, RoleCounts>(), dogs: 0 }))
  const bySource = new Map<string, RoleCounts>()
  const totals = empty()
  let dogTotal = 0

  for (const row of signups) {
    if (row.demo || row.admin) continue
    const i = weekIndex(row.at, starts)
    if (i < 0) continue
    const roles = rolesOf(row)
    const source = sourceOf(row.referredBy, memberCodes)
    const week = perWeek[i]
    add(week.signups, roles)
    if (!week.sources.has(source)) week.sources.set(source, empty())
    add(week.sources.get(source)!, roles)
    if (!bySource.has(source)) bySource.set(source, empty())
    add(bySource.get(source)!, roles)
    add(totals, roles)
  }

  for (const dog of dogs) {
    if (dog.demo || dog.admin) continue
    const i = weekIndex(dog.at, starts)
    if (i < 0) continue
    perWeek[i].dogs++
    dogTotal++
  }

  return {
    weeks: starts.map((start, i) => {
      const { year, week } = isoWeek(toZonedParts(start).date)
      return {
        start,
        end: new Date(start.getTime() + 6.5 * DAY),
        isoYear: year,
        isoWeek: week,
        signups: perWeek[i].signups,
        sources: sorted(perWeek[i].sources),
        dogs: perWeek[i].dogs,
      }
    }),
    bySource: sorted(bySource),
    totals,
    dogs: dogTotal,
  }
}
