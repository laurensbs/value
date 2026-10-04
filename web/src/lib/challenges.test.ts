import { describe, expect, it } from 'vitest'
import { challengeView, challengesFrom, goalFor, monthBounds, type ChallengeWalk } from './challenges'

const walk = (city: string, at: string, walkerId = 'w1', dogId = 'd1', distanceM = 1500): ChallengeWalk => ({
  city,
  walkerId,
  dogId,
  distanceM,
  startedAt: new Date(at),
})

describe('monthly challenges', () => {
  it('use local months', () => {
    // 1 October 00:30 in Amsterdam is still 30 September in UTC.
    const b = monthBounds(new Date('2026-09-30T22:30:00Z'))
    expect(b.month).toBe('2026-10')
    expect(b.start.toISOString()).toBe('2026-09-30T22:00:00.000Z')
    expect(b.end.toISOString()).toBe('2026-10-31T23:00:00.000Z') // winter time from 25 October
    expect(b.previous.toISOString()).toBe('2026-08-31T22:00:00.000Z')
    expect(monthBounds(new Date('2027-01-15T12:00:00Z')).previous.toISOString()).toBe('2026-11-30T23:00:00.000Z')
  })

  it('set a goal a quarter above last month, with a minimum', () => {
    expect(goalFor(0, 10)).toBe(10)
    expect(goalFor(37, 10)).toBe(50)
    expect(goalFor(80, 10)).toBe(100)
    expect(goalFor(3, 25)).toBe(25)
  })

  it('count the town (spelled any way) and everyone, this month only', () => {
    const walks = [
      walk('Utrecht', '2026-10-02T10:00:00Z', 'me', 'd1', 2000),
      walk('utrecht ', '2026-10-03T10:00:00Z', 'other', 'd2', 1000),
      walk('Amersfoort', '2026-10-04T10:00:00Z', 'other', 'd3'),
      walk('Utrecht', '2026-09-20T10:00:00Z', 'other', 'd2'),
    ]
    const c = challengesFrom(walks, { userId: 'me', city: 'Utrecht' }, new Date('2026-10-05T12:00:00Z'))
    expect(c.month).toBe('2026-10')
    expect(c.season).toBe('autumn')
    expect(c.city).toMatchObject({ name: 'Utrecht', slug: 'utrecht', walks: 2, km: 3, dogs: 2, walkers: 2, mine: 1, goal: 10, done: false })
    expect(c.all).toMatchObject({ walks: 3, mine: 1, goal: 25, done: false })
  })

  it('are done when the goal is reached', () => {
    const walks = Array.from({ length: 10 }, (_, i) => walk('Gent', `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00Z`))
    expect(challengesFrom(walks, { userId: 'x', city: 'Gent' }, new Date('2026-10-20T12:00:00Z')).city?.done).toBe(true)
  })

  it('skip the town when the profile has none', () => {
    expect(challengesFrom([], { userId: 'x', city: '  ' }, new Date()).city).toBeNull()
  })

  it('show no numbers before the first walk, and totals only with five walkers and five dogs', () => {
    expect(challengeView({ walks: 0, walkers: 0, dogs: 0 })).toEqual({ empty: true, totals: false })
    expect(challengeView({ walks: 3, walkers: 2, dogs: 3 })).toEqual({ empty: false, totals: false })
    expect(challengeView({ walks: 12, walkers: 5, dogs: 4 })).toEqual({ empty: false, totals: false })
    expect(challengeView({ walks: 12, walkers: 5, dogs: 5 })).toEqual({ empty: false, totals: true })
  })
})
