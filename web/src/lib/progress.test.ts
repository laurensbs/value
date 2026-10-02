import { describe, expect, it } from 'vitest'
import {
  activeWeeks,
  badgesFor,
  bondFor,
  earnedTiers,
  firstSteps,
  LEVELS,
  levelFor,
  localParts,
  seasonOf,
  statsFrom,
  tierColor,
  walksInWeek,
  weekOf,
  type PointEvent,
} from './progress'

const walk = (at: string, dogId = 'd1', ref = at): PointEvent => ({ kind: 'walk', ref, points: 25, at: new Date(at), meta: { dogId } })

describe('levels', () => {
  it('start at 1 and only go up with points', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, key: 'puppy', floor: 0, next: 25, nextKey: 'sniffer', progress: 0 })
    expect(levelFor(24).level).toBe(1)
    expect(levelFor(25)).toMatchObject({ level: 2, key: 'sniffer', floor: 25, next: 75 })
    expect(levelFor(50).progress).toBeCloseTo(0.5)
    let previous = 0
    for (let p = 0; p < 2000; p += 7) {
      const { level } = levelFor(p)
      expect(level).toBeGreaterThanOrEqual(previous)
      previous = level
    }
  })

  it('end at level 10 without a next level', () => {
    expect(levelFor(LEVELS[9])).toMatchObject({ level: 10, key: 'legend', next: null, nextKey: null, progress: 1 })
    expect(levelFor(99_999).level).toBe(10)
  })

  it('reach level 2 on the first day: profile and quiz', () => {
    expect(levelFor(10 + 15).level).toBe(2)
  })
})

describe('local time', () => {
  it('uses Amsterdam time, also across daylight saving', () => {
    // 06:30 UTC is 08:30 in summer (CEST) and 07:30 in winter (CET).
    expect(localParts(new Date('2026-07-01T06:30:00Z')).hour).toBe(8)
    expect(localParts(new Date('2026-01-15T06:30:00Z')).hour).toBe(7)
  })

  it('weeks start on Monday, in local time', () => {
    expect(weekOf(new Date('2026-10-05T10:00:00Z'))).toBe('2026-10-05') // Monday
    expect(weekOf(new Date('2026-10-11T20:00:00Z'))).toBe('2026-10-05') // Sunday 22:00
    // Sunday 23:30 UTC is already Monday 01:30 in Amsterdam: a new week.
    expect(weekOf(new Date('2026-10-11T23:30:00Z'))).toBe('2026-10-12')
    // Across a year boundary.
    expect(weekOf(new Date('2027-01-01T12:00:00Z'))).toBe('2026-12-28')
  })

  it('knows the seasons', () => {
    expect(seasonOf(new Date('2026-12-10T12:00:00Z'))).toBe('winter')
    expect(seasonOf(new Date('2026-02-28T12:00:00Z'))).toBe('winter')
    expect(seasonOf(new Date('2026-04-01T12:00:00Z'))).toBe('spring')
    expect(seasonOf(new Date('2026-08-31T12:00:00Z'))).toBe('summer')
    expect(seasonOf(new Date('2026-10-02T12:00:00Z'))).toBe('autumn')
  })
})

describe('stats and badges', () => {
  const events: PointEvent[] = [
    walk('2026-10-03T05:30:00Z', 'd1'), // Saturday 07:30: early and weekend
    walk('2026-10-05T18:30:00Z', 'd1'), // Monday 20:30: evening
    walk('2026-10-07T12:00:00Z', 'd1'),
    walk('2026-10-08T12:00:00Z', 'd2'),
    { kind: 'walk-photo', ref: 'x', points: 5, at: new Date('2026-10-08T12:00:00Z'), meta: {} },
    { kind: 'quiz', ref: '', points: 15, at: new Date('2026-10-01T12:00:00Z'), meta: {} },
    { kind: 'dog-walked', ref: 'w9', points: 10, at: new Date('2026-10-01T12:00:00Z'), meta: { dogId: 'd9', walkerId: 'a' } },
    { kind: 'dog-walked', ref: 'w10', points: 10, at: new Date('2026-10-02T12:00:00Z'), meta: { dogId: 'd9', walkerId: 'a' } },
  ]

  it('counts what someone did', () => {
    expect(statsFrom(events)).toMatchObject({
      walks: 4,
      dogs: 2,
      buddy: 3,
      early: 1,
      evening: 1,
      weekend: 1,
      seasons: 1,
      photos: 1,
      quiz: 1,
      dogWalks: 2,
      dogFriends: 1,
    })
    expect(statsFrom([])).toMatchObject({ walks: 0, buddy: 0, dogFriends: 0 })
  })

  it('earns tiers and shows what is next', () => {
    const walker = badgesFor(statsFrom(events), { walker: true, owner: false })
    expect(walker.find((b) => b.key === 'walks')).toMatchObject({ tier: 1, value: 4, next: 10 })
    expect(walker.find((b) => b.key === 'buddy')).toMatchObject({ tier: 0, value: 3, next: 5 })
    expect(walker.find((b) => b.key === 'quiz')).toMatchObject({ tier: 1, next: null })
    expect(walker.find((b) => b.key === 'pack')).toMatchObject({ tier: 0, value: 2, next: 3 })
    // Earned badges come first.
    const firstLocked = walker.findIndex((b) => b.tier === 0)
    expect(walker.slice(firstLocked).every((b) => b.tier === 0)).toBe(true)
  })

  it('shows owner badges to owners, and earned ones to everyone', () => {
    const walkerOnly = badgesFor(statsFrom([walk('2026-10-03T12:00:00Z')]), { walker: true, owner: false })
    expect(walkerOnly.some((b) => b.key === 'host')).toBe(false)
    const owner = badgesFor(statsFrom(events), { walker: false, owner: true })
    expect(owner.find((b) => b.key === 'host')).toMatchObject({ tier: 1 })
    // Not a walker, but earned walking badges stay visible.
    expect(owner.some((b) => b.key === 'walks')).toBe(true)
    expect(owner.some((b) => b.key === 'evening' && b.tier === 1)).toBe(true)
    expect(owner.some((b) => b.key === 'reports')).toBe(false)
  })

  it('lists every earned tier separately', () => {
    const tiers = earnedTiers(badgesFor(statsFrom(Array.from({ length: 10 }, (_, i) => walk(`2026-09-${String(i + 1).padStart(2, '0')}T12:00:00Z`))), { walker: true, owner: false }))
    expect(tiers).toContainEqual({ key: 'walks', tier: 1 })
    expect(tiers).toContainEqual({ key: 'buddy', tier: 2 })
    expect(tiers).toContainEqual({ key: 'walks', tier: 2 })
    expect(tiers).not.toContainEqual({ key: 'walks', tier: 3 })
  })

  it('colours tiers', () => {
    expect([1, 2, 3, 4, 5, 9].map(tierColor)).toEqual(['bronze', 'silver', 'gold', 'green', 'ball', 'ball'])
  })
})

describe('dog friends', () => {
  it('grow from just met to best friends, like in the app', () => {
    expect([1, 2, 4, 5, 9, 10, 40].map(bondFor)).toEqual(['met', 'buddies', 'buddies', 'good', 'good', 'best', 'best'])
  })
})

describe('the week', () => {
  it('counts walks this week, and weeks with a walk that never reset', () => {
    const events = [walk('2026-09-22T12:00:00Z'), walk('2026-10-05T08:00:00Z'), walk('2026-10-06T08:00:00Z')]
    expect(walksInWeek(events, new Date('2026-10-07T12:00:00Z'))).toBe(2)
    expect(walksInWeek(events, new Date('2026-10-13T12:00:00Z'))).toBe(0)
    expect(activeWeeks(events)).toBe(2)
  })
})

describe('first steps', () => {
  const none = { about: false, quiz: false, requested: false, walks: 0, hasDog: false, dogMet: false, dogWalks: 0 }

  it('differ for walkers and owners, and start with one done', () => {
    expect(firstSteps(none, { walker: true, owner: false }).map((s) => s.key)).toEqual(['account', 'about', 'quiz', 'meet', 'walk'])
    expect(firstSteps(none, { walker: false, owner: true }).map((s) => s.key)).toEqual(['account', 'about', 'dog', 'dogMet', 'dogWalk'])
    expect(firstSteps(none, { walker: true, owner: true }).map((s) => s.key)).toEqual(['account', 'about', 'dog', 'quiz', 'meet', 'walk'])
    expect(firstSteps(none, { walker: true, owner: false })[0].done).toBe(true)
  })

  it('tick off what is done', () => {
    const steps = firstSteps({ ...none, quiz: true, walks: 1 }, { walker: true, owner: false })
    expect(steps.filter((s) => s.done).map((s) => s.key)).toEqual(['account', 'quiz', 'walk'])
  })
})
