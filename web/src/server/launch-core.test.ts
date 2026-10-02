import { describe, expect, it } from 'vitest'
import {
  countPerWeek,
  detectMilestones,
  groupTasks,
  levelFor,
  LEVELS,
  MILESTONES,
  monthlyCosts,
  newlyReached,
  pointsFor,
  ratio,
  routeToFirstWalk,
  TASKS,
  taskStates,
  walksPerActiveWalker,
  weekStarts,
  type LaunchFacts,
} from './launch-core'

const at = (iso: string) => new Date(iso)
const real = (iso: string) => ({ at: at(iso), demo: false })
const demo = (iso: string) => ({ at: at(iso), demo: true })
const member = (iso: string, opts: { demo?: boolean; admin?: boolean } = {}) => ({ at: at(iso), demo: opts.demo ?? false, admin: opts.admin ?? false })
const none: LaunchFacts = { shelters: [], intros: [], walks: [], members: [] }

describe('launch tasks', () => {
  it('has exactly four "Wacht op Laurens" tasks, first and in this order', () => {
    expect(TASKS.filter((t) => t.waiting).map((t) => t.key)).toEqual(['name', 'goLive', 'submit', 'money'])
    expect(TASKS.slice(0, 4).every((t) => t.waiting && t.owner === 'laurens')).toBe(true)
  })

  it('has unique keys and positive points', () => {
    expect(new Set(TASKS.map((t) => t.key)).size).toBe(TASKS.length)
    expect(TASKS.every((t) => t.points > 0)).toBe(true)
  })

  it('combines stored status with automatic checks', () => {
    const tasks = taskStates(
      [
        { key: 'trademark', status: 'done', doneAt: at('2026-10-03T10:00:00Z'), note: 'geen treffers' },
        { key: 'legal', status: 'open', doneAt: null, note: '' },
      ],
      { socialLogin: true },
    )
    const byKey = Object.fromEntries(tasks.map((t) => [t.key, t]))
    expect(byKey.trademark).toMatchObject({ done: true, autoDone: false, note: 'geen treffers' })
    expect(byKey.socialKeys).toMatchObject({ done: true, autoDone: true })
    expect(byKey.legal.done).toBe(false)
    expect(byKey.goLive).toMatchObject({ done: false, autoDone: false })
  })

  it("puts Laurens' own open tasks above the rest, and done ones last", () => {
    const tasks = taskStates([{ key: 'trademark', status: 'done', doneAt: null, note: '' }], {})
    const groups = groupTasks(tasks)
    expect(groups.waiting).toHaveLength(4)
    expect(groups.mine.every((t) => t.owner === 'laurens' && !t.done)).toBe(true)
    expect(groups.mine.map((t) => t.key)).not.toContain('trademark')
    expect(groups.others.every((t) => t.owner !== 'laurens')).toBe(true)
    expect(groups.others[0].owner).toBe('samen')
    expect(groups.done.map((t) => t.key)).toEqual(['trademark'])
  })
})

describe('points, levels and badges', () => {
  it('counts only what is done or reached', () => {
    const tasks = [
      { done: true, points: 30 },
      { done: false, points: 40 },
    ]
    const milestones = [
      { reached: true, points: 50 },
      { reached: false, points: 60 },
    ]
    expect(pointsFor(tasks, milestones)).toBe(80)
    expect(pointsFor([], [])).toBe(0)
  })

  it('goes Pup → Wandelaar → Roedelleider', () => {
    expect(LEVELS.map((l) => l.key)).toEqual(['pup', 'walker', 'packLeader'])
    expect(levelFor(0)).toMatchObject({ key: 'pup', number: 1, toNext: 150, progress: 0, next: { key: 'walker' } })
    expect(levelFor(75).progress).toBe(0.5)
    expect(levelFor(149).key).toBe('pup')
    expect(levelFor(150)).toMatchObject({ key: 'walker', number: 2, toNext: 250, progress: 0 })
    expect(levelFor(400)).toMatchObject({ key: 'packLeader', number: 3, next: null, toNext: 0, progress: 1 })
    expect(levelFor(5000).key).toBe('packLeader')
  })

  it('can reach the top level with everything done', () => {
    const all = pointsFor(
      TASKS.map((t) => ({ done: true, points: t.points })),
      MILESTONES.map((m) => ({ reached: true, points: m.points })),
    )
    expect(levelFor(all).key).toBe('packLeader')
  })
})

describe('milestones from real data', () => {
  it('ignores example rows and admins', () => {
    const facts: LaunchFacts = {
      shelters: [demo('2026-10-01T10:00:00Z')],
      intros: [demo('2026-10-01T10:00:00Z')],
      walks: [{ ...demo('2026-10-01T10:00:00Z'), walkerId: 'demo-walker' }],
      members: [
        ...Array.from({ length: 12 }, (_, i) => member(`2026-10-01T10:${String(i).padStart(2, '0')}:00Z`, { demo: true })),
        member('2026-10-02T10:00:00Z', { admin: true }),
      ],
    }
    const result = detectMilestones(facts)
    expect(result.every((m) => !m.reached)).toBe(true)
    expect(result.find((m) => m.id === 'members10')?.current).toBe(0)
  })

  it('dates a milestone by the real row that reached it', () => {
    const facts: LaunchFacts = {
      ...none,
      // The demo shelter came first, but only the real one counts.
      shelters: [demo('2026-10-01T08:00:00Z'), real('2026-10-05T09:00:00Z')],
      walks: [
        { ...real('2026-10-09T18:00:00Z'), walkerId: 'b' },
        { ...real('2026-10-08T18:00:00Z'), walkerId: 'a' },
      ],
      members: Array.from({ length: 11 }, (_, i) => member(`2026-10-${String(i + 1).padStart(2, '0')}T12:00:00Z`)),
    }
    const byId = Object.fromEntries(detectMilestones(facts).map((m) => [m.id, m]))
    expect(byId.firstShelter).toMatchObject({ reached: true, at: at('2026-10-05T09:00:00Z') })
    expect(byId.firstWalk.at).toEqual(at('2026-10-08T18:00:00Z'))
    expect(byId.firstIntro.reached).toBe(false)
    expect(byId.members10).toMatchObject({ reached: true, at: at('2026-10-10T12:00:00Z'), current: 10, target: 10 })
    expect(byId.members50).toMatchObject({ reached: false, current: 11, target: 50 })
  })

  it('keeps a stored milestone, and stores only new ones', () => {
    const stored = new Map([['milestone:firstWalk', at('2026-10-08T18:00:00Z')]])
    const facts: LaunchFacts = { ...none, intros: [real('2026-10-07T10:00:00Z')] }
    const milestones = detectMilestones(facts, stored)
    expect(milestones.find((m) => m.id === 'firstWalk')).toMatchObject({ reached: true, at: at('2026-10-08T18:00:00Z') })
    expect(newlyReached(milestones, stored).map((m) => m.id)).toEqual(['firstIntro'])
  })

  it('walks the road to the first real walk', () => {
    const tasks = taskStates([{ key: 'goLive', status: 'done', doneAt: null, note: '' }], { realDog: true })
    const milestones = detectMilestones({ ...none, intros: [real('2026-10-07T10:00:00Z')] })
    const route = routeToFirstWalk(tasks, milestones)
    expect(route.steps.map((s) => [s.key, s.done])).toEqual([
      ['live', true],
      ['supply', true],
      ['intro', true],
      ['walk', false],
    ])
    expect(route).toMatchObject({ done: 3, total: 4 })
  })
})

describe('weeks', () => {
  it('starts on Monday midnight in Amsterdam, oldest first', () => {
    // Saturday 3 October 2026, afternoon.
    const starts = weekStarts(at('2026-10-03T14:00:00Z'))
    expect(starts).toHaveLength(8)
    // Monday 28 September 00:00 in Amsterdam (summer time) is 27 September 22:00 UTC.
    expect(starts[7]).toEqual(at('2026-09-27T22:00:00Z'))
    expect(starts[0]).toEqual(at('2026-08-09T22:00:00Z'))
    // After the switch to winter time a week starts at 23:00 UTC.
    expect(weekStarts(at('2026-11-04T12:00:00Z'), 1)[0]).toEqual(at('2026-11-01T23:00:00Z'))
  })

  it('counts rows per week and leaves out what is older than 8 weeks', () => {
    const starts = weekStarts(at('2026-10-03T14:00:00Z'))
    const counts = countPerWeek(
      [
        { at: at('2026-09-27T22:00:00Z') }, // Monday 00:00, this week
        { at: at('2026-09-27T21:59:00Z') }, // Sunday 23:59, last week
        { at: at('2026-10-03T13:00:00Z') },
        { at: at('2026-10-03T16:00:00Z') }, // a database clock a little ahead: still this week
        { at: at('2026-08-09T21:59:00Z') }, // just before the 8 weeks: left out
      ],
      starts,
    )
    expect(counts).toEqual([0, 0, 0, 0, 0, 0, 1, 3])
  })
})

describe('costs and averages', () => {
  it('counts Apple and the domain only once joined or bought', () => {
    const before = monthlyCosts(new Set())
    expect(before.total).toBe(0)
    expect(before.lines.find((l) => l.key === 'apple')).toMatchObject({ monthly: 8.25, perYear: 99, active: false })
    const after = monthlyCosts(new Set(['appleAccount', 'domain']))
    expect(after.total).toBe(9.25)
    expect(after.lines.every((l) => l.active)).toBe(true)
  })

  it('says "—" (null) instead of dividing by zero', () => {
    expect(ratio(9.25, 0)).toBeNull()
    expect(ratio(9.25, 37)).toBe(0.25)
  })

  it('counts walks per active walker over the last 30 days, without example walks', () => {
    const now = at('2026-10-31T12:00:00Z')
    const walks = [
      { ...real('2026-10-30T10:00:00Z'), walkerId: 'a' },
      { ...real('2026-10-20T10:00:00Z'), walkerId: 'a' },
      { ...real('2026-10-10T10:00:00Z'), walkerId: 'b' },
      { ...real('2026-09-01T10:00:00Z'), walkerId: 'c' }, // too long ago
      { ...demo('2026-10-29T10:00:00Z'), walkerId: 'demo-x' },
    ]
    expect(walksPerActiveWalker(walks, now)).toBe(1.5)
    expect(walksPerActiveWalker([], now)).toBeNull()
  })
})
