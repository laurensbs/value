import { describe, expect, it } from 'vitest'
import { DIRECT, INVITE, isoWeek, rolesOf, sourceOf, sourcesReport, type NewDogRow, type SignupRow } from './sources-core'

// Monday 5 October 2026, 12:00 in Amsterdam: ISO week 41 has just begun.
const NOW = new Date('2026-10-05T10:00:00Z')

const signup = (at: string, referredBy: string | null, role: 'walker' | 'owner' | 'both' | 'shelter', extra: Partial<SignupRow> = {}): SignupRow => ({
  at: new Date(at),
  referredBy,
  wantsToWalk: role === 'walker' || role === 'both',
  hasDogs: role === 'owner' || role === 'both',
  shelterMember: false,
  demo: false,
  admin: false,
  ...extra,
})
const dog = (at: string, extra: Partial<NewDogRow> = {}): NewDogRow => ({ at: new Date(at), demo: false, admin: false, ...extra })

describe('sourceOf', () => {
  const members = new Set(['FLE234'])

  it('is direct without a code', () => {
    expect(sourceOf(null, members)).toBe(DIRECT)
    expect(sourceOf('', members)).toBe(DIRECT)
    expect(sourceOf(' - ', members)).toBe(DIRECT)
  })

  it("groups a member's own code as an invitation, never showing it", () => {
    expect(sourceOf('FLE234', members)).toBe(INVITE)
    // Lowercase from the app API: cleaned the way an invite link cleans it.
    expect(sourceOf('fle234', members)).toBe(INVITE)
    // A personal-looking code whose member has left stays private too.
    expect(sourceOf('XYZ789', members)).toBe(INVITE)
  })

  it('keeps campaign codes, cleaned', () => {
    expect(sourceOf('INSTAGRAM', members)).toBe('INSTAGRAM')
    expect(sourceOf('whydonate', members)).toBe('WHYDONATE')
    expect(sourceOf('ig-stories', members)).toBe('IGSTORIES')
    expect(sourceOf('HELPONS', members)).toBe('HELPONS')
    // Short codes from the docs (/r/INSTA) and codes with letters a personal code never has.
    expect(sourceOf('INSTA', members)).toBe('INSTA')
    expect(sourceOf('POSTER', members)).toBe('POSTER')
  })
})

describe('rolesOf', () => {
  it('follows the choice in onboarding', () => {
    expect(rolesOf({ wantsToWalk: true, hasDogs: false, shelterMember: false })).toEqual(['walker'])
    expect(rolesOf({ wantsToWalk: false, hasDogs: true, shelterMember: false })).toEqual(['owner'])
    expect(rolesOf({ wantsToWalk: true, hasDogs: true, shelterMember: false })).toEqual(['walker', 'owner'])
    // "Ik werk bij een opvang": neither walking nor a dog, before or after the shelter form.
    expect(rolesOf({ wantsToWalk: false, hasDogs: false, shelterMember: false })).toEqual(['shelter'])
    expect(rolesOf({ wantsToWalk: false, hasDogs: false, shelterMember: true })).toEqual(['shelter'])
    expect(rolesOf({ wantsToWalk: true, hasDogs: false, shelterMember: true })).toEqual(['walker', 'shelter'])
  })
})

describe('isoWeek', () => {
  it('numbers weeks the ISO 8601 way, around the turn of the year too', () => {
    expect(isoWeek('2026-10-05')).toEqual({ year: 2026, week: 41 })
    expect(isoWeek('2026-10-11')).toEqual({ year: 2026, week: 41 })
    expect(isoWeek('2026-08-17')).toEqual({ year: 2026, week: 34 })
    expect(isoWeek('2025-12-29')).toEqual({ year: 2026, week: 1 })
    expect(isoWeek('2026-01-01')).toEqual({ year: 2026, week: 1 })
    expect(isoWeek('2026-12-31')).toEqual({ year: 2026, week: 53 })
    expect(isoWeek('2027-01-03')).toEqual({ year: 2026, week: 53 })
    expect(isoWeek('2027-01-04')).toEqual({ year: 2027, week: 1 })
    expect(isoWeek('2021-01-03')).toEqual({ year: 2020, week: 53 })
  })
})

describe('sourcesReport', () => {
  const members = new Set(['FLE234'])
  const signups: SignupRow[] = [
    // This week (from Monday 00:00 Amsterdam = Sunday 22:00 UTC).
    signup('2026-10-05T08:00:00Z', 'INSTAGRAM', 'walker'),
    signup('2026-10-05T09:00:00Z', 'instagram', 'both'),
    signup('2026-10-04T22:30:00Z', null, 'owner'),
    signup('2026-10-05T09:30:00Z', 'FLE234', 'walker'),
    // Sunday 23:30 in Amsterdam: still last week.
    signup('2026-10-04T21:30:00Z', 'WHYDONATE', 'shelter', { shelterMember: true }),
    // A row a little "in the future" (the database clock ahead): this week.
    signup('2026-10-12T08:00:00Z', 'HELPONS', 'owner'),
    // Week 34, the first one shown.
    signup('2026-08-17T08:00:00Z', 'IGSTORIES', 'walker'),
    // Before the eight weeks, example data and admins: never counted.
    signup('2026-08-16T12:00:00Z', 'INSTAGRAM', 'walker'),
    signup('2026-10-05T08:00:00Z', 'INSTAGRAM', 'walker', { demo: true }),
    signup('2026-10-05T08:00:00Z', 'INSTAGRAM', 'shelter', { admin: true }),
  ]
  const dogs: NewDogRow[] = [
    dog('2026-10-05T08:00:00Z'),
    dog('2026-09-30T08:00:00Z'),
    dog('2026-09-29T08:00:00Z'),
    dog('2026-10-05T08:00:00Z', { demo: true }),
    dog('2026-10-05T08:00:00Z', { admin: true }),
    dog('2026-08-01T08:00:00Z'),
  ]
  const report = sourcesReport(signups, dogs, members, NOW)

  it('shows eight ISO weeks, Monday to Sunday in Amsterdam, the current one last', () => {
    expect(report.weeks.map((w) => w.isoWeek)).toEqual([34, 35, 36, 37, 38, 39, 40, 41])
    expect(report.weeks.every((w) => w.isoYear === 2026)).toBe(true)
    const now = report.weeks[7]
    expect(now.start).toEqual(new Date('2026-10-04T22:00:00Z'))
    // The end falls on Sunday 11 October, for the "5–11 okt" label.
    expect(now.end.toISOString().slice(0, 10)).toBe('2026-10-11')
  })

  it('counts sign-ups per week, per source and per role', () => {
    const now = report.weeks[7]
    expect(now.signups).toEqual({ walker: 3, owner: 3, shelter: 0, total: 5 })
    expect(now.sources).toEqual([
      { key: 'INSTAGRAM', counts: { walker: 2, owner: 1, shelter: 0, total: 2 } },
      { key: DIRECT, counts: { walker: 0, owner: 1, shelter: 0, total: 1 } },
      { key: INVITE, counts: { walker: 1, owner: 0, shelter: 0, total: 1 } },
      { key: 'HELPONS', counts: { walker: 0, owner: 1, shelter: 0, total: 1 } },
    ])
    expect(report.weeks[6].sources).toEqual([{ key: 'WHYDONATE', counts: { walker: 0, owner: 0, shelter: 1, total: 1 } }])
    expect(report.weeks[0].sources).toEqual([{ key: 'IGSTORIES', counts: { walker: 1, owner: 0, shelter: 0, total: 1 } }])
    expect(report.weeks.slice(1, 6).every((w) => w.signups.total === 0 && w.sources.length === 0)).toBe(true)
  })

  it('adds the weeks up per source, most first', () => {
    expect(report.totals).toEqual({ walker: 4, owner: 3, shelter: 1, total: 7 })
    expect(report.bySource.map((s) => [s.key, s.counts.total])).toEqual([
      ['INSTAGRAM', 2],
      [DIRECT, 1],
      [INVITE, 1],
      ['HELPONS', 1],
      ['IGSTORIES', 1],
      ['WHYDONATE', 1],
    ])
  })

  it('counts only real new dogs', () => {
    expect(report.weeks.map((w) => w.dogs)).toEqual([0, 0, 0, 0, 0, 0, 2, 1])
    expect(report.dogs).toBe(3)
  })

  it('never lets a personal code out', () => {
    expect(JSON.stringify(report)).not.toContain('FLE234')
  })

  it('is calm and empty without anyone', () => {
    const none = sourcesReport([], [], new Set(), NOW)
    expect(none.weeks).toHaveLength(8)
    expect(none.bySource).toEqual([])
    expect(none.totals).toEqual({ walker: 0, owner: 0, shelter: 0, total: 0 })
    expect(none.dogs).toBe(0)
  })
})
