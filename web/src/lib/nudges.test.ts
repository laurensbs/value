import { describe, expect, it } from 'vitest'
import { pickNudge, type NudgeFacts, type SentNudge } from './nudges'

// The daily run is at 07:30 UTC (09:30 in Amsterdam). 1 October 2026 is a Thursday.
const at = (date: string) => new Date(`${date}T07:30:00Z`)

const walker = { walker: true, owner: false }
const owner = { walker: false, owner: true }

function facts(over: Partial<NudgeFacts> = {}): NudgeFacts {
  return {
    roles: walker,
    joinedAt: at('2026-08-01'),
    weeklyGoal: null,
    walks: 0,
    lastWalkAt: null,
    walksThisWeek: 0,
    plannedThisWeek: 0,
    planned: false,
    steps: { about: true, dog: true, quiz: true, meet: true },
    challenge: null,
    favouriteDog: null,
    quietDog: null,
    sent: [],
    ...over,
  }
}

const sent = (kind: string, date: string, data: SentNudge['data'] = {}): SentNudge => ({ kind, at: at(date), data })

describe('first steps', () => {
  const newWalker = (over: Partial<NudgeFacts> = {}) =>
    facts({ joinedAt: new Date('2026-10-05T20:00:00Z'), steps: { about: false, dog: false, quiz: false, meet: false }, ...over })

  it('waits a day, then reminds of the next step', () => {
    expect(pickNudge(newWalker(), new Date('2026-10-05T21:00:00Z'))).toBeNull()
    expect(pickNudge(newWalker(), at('2026-10-06'))).toEqual({ kind: 'nudge-step', data: { step: 'about' } })
  })

  it('never asks the same step twice and stops after three', () => {
    const one = [sent('nudge-step', '2026-10-06', { step: 'about' })]
    expect(pickNudge(newWalker({ sent: one }), at('2026-10-09'))?.data).toEqual({ step: 'quiz' })
    const two = [...one, sent('nudge-step', '2026-10-09', { step: 'quiz' })]
    expect(pickNudge(newWalker({ sent: two }), at('2026-10-12'))?.data).toEqual({ step: 'meet' })
    const three = [...two, sent('nudge-step', '2026-10-12', { step: 'meet' })]
    expect(pickNudge(newWalker({ sent: three }), at('2026-10-15'))).toBeNull()
  })

  it('tells owners that a profile helps walkers', () => {
    const o = newWalker({ roles: owner })
    expect(pickNudge(o, at('2026-10-06'))?.data).toEqual({ step: 'about', role: 'owner' })
  })

  it('suggests a dog to owners and nothing after three weeks', () => {
    const o = newWalker({ roles: owner, steps: { about: true, dog: false, quiz: false, meet: false } })
    expect(pickNudge(o, at('2026-10-07'))?.data).toEqual({ step: 'dog' })
    expect(pickNudge(o, at('2026-10-28'))).toBeNull()
  })
})

describe('spacing', () => {
  it('sends nothing within three calendar days of the last reminder', () => {
    const f = facts({ joinedAt: at('2026-10-05'), steps: { about: false, dog: false, quiz: false, meet: false } })
    expect(pickNudge({ ...f, sent: [sent('nudge-week', '2026-10-06')] }, at('2026-10-08'))).toBeNull()
    // Even when the run is a little earlier than three full days later.
    const late = { kind: 'nudge-week', at: new Date('2026-10-06T07:59:00Z'), data: {} }
    expect(pickNudge({ ...f, sent: [late] }, at('2026-10-09'))).not.toBeNull()
  })
})

describe('the town challenge', () => {
  const utrecht = { city: 'Utrecht', goal: 50, walks: 12, mine: 0, done: false }

  it('starts the month with an invitation, once', () => {
    const f = facts({ walks: 4, challenge: utrecht })
    expect(pickNudge(f, at('2026-11-01'))).toEqual({ kind: 'nudge-challenge', data: { city: 'Utrecht', goal: 50 } })
    expect(pickNudge({ ...f, sent: [sent('nudge-challenge', '2026-11-01')] }, at('2026-11-04'))).toBeNull()
    expect(pickNudge(f, at('2026-11-04'))).toBeNull()
  })

  it('skips walkers who never walked and joined long ago', () => {
    expect(pickNudge(facts({ joinedAt: at('2026-01-01'), challenge: utrecht }), at('2026-11-01'))).toBeNull()
  })

  it('shares the good news with those who helped', () => {
    const done = { ...utrecht, walks: 50, mine: 3, done: true }
    expect(pickNudge(facts({ walks: 9, challenge: done }), at('2026-10-20'))).toEqual({
      kind: 'challenge-done',
      data: { city: 'Utrecht', goal: 50, mine: 3 },
    })
    expect(pickNudge(facts({ walks: 9, challenge: { ...done, mine: 0 } }), at('2026-10-20'))).toBeNull()
    expect(pickNudge(facts({ walks: 9, challenge: done, sent: [sent('challenge-done', '2026-10-10')] }), at('2026-10-20'))).toBeNull()
  })
})

describe('the weekly goal', () => {
  const f = facts({ weeklyGoal: 2, walks: 5, walksThisWeek: 0, plannedThisWeek: 1 })

  it('reminds on Thursday what is left, counting planned walks', () => {
    expect(pickNudge(f, at('2026-10-08'))).toEqual({ kind: 'nudge-week', data: { left: 1, goal: 2 } })
    expect(pickNudge(f, at('2026-10-07'))).toBeNull()
  })

  it('stays quiet when the goal is reached, planned or out of reach', () => {
    expect(pickNudge({ ...f, walksThisWeek: 1 }, at('2026-10-08'))).toBeNull()
    expect(pickNudge({ ...f, weeklyGoal: 7, plannedThisWeek: 0 }, at('2026-10-09'))).toBeNull()
  })

  it('tries Friday when Thursday was taken, once a week', () => {
    expect(pickNudge({ ...f, sent: [sent('nudge-step', '2026-10-06')] }, at('2026-10-09'))?.kind).toBe('nudge-week')
    expect(pickNudge({ ...f, sent: [sent('nudge-week', '2026-10-05')] }, at('2026-10-09'))).toBeNull()
  })
})

describe('coming back', () => {
  const bello = { id: 'bello', name: 'Bello' }
  const f = facts({ walks: 3, lastWalkAt: at('2026-10-01'), favouriteDog: bello })

  it('invites after two quiet weeks, with the dog they know', () => {
    expect(pickNudge(f, at('2026-10-14'))).toBeNull()
    expect(pickNudge(f, at('2026-10-15'))).toEqual({ kind: 'nudge-back', data: { variant: 'dog', dogId: 'bello', dogName: 'Bello' } })
    expect(pickNudge({ ...f, favouriteDog: null }, at('2026-10-15'))?.data).toEqual({ variant: 'any' })
  })

  it('not when something is planned, and twice at most until the next walk', () => {
    expect(pickNudge({ ...f, planned: true }, at('2026-10-15'))).toBeNull()
    const once = [sent('nudge-back', '2026-10-15')]
    expect(pickNudge({ ...f, sent: once }, at('2026-10-20'))).toBeNull()
    expect(pickNudge({ ...f, sent: once }, at('2026-10-29'))?.kind).toBe('nudge-back')
    const twice = [...once, sent('nudge-back', '2026-10-29')]
    expect(pickNudge({ ...f, sent: twice }, at('2026-12-01'))).toBeNull()
    // A new walk starts the count again.
    expect(pickNudge({ ...f, sent: twice, lastWalkAt: at('2026-11-10') }, at('2026-12-01'))?.kind).toBe('nudge-back')
  })
})

describe('owners', () => {
  const quiet = { id: 'bello', name: 'Bello', since: at('2026-10-01'), photos: 0, slots: 0 }

  it('gives a practical tip when a dog had no request for a week, twice at most', () => {
    const f = facts({ roles: owner, quietDog: quiet })
    expect(pickNudge(f, at('2026-10-07'))).toBeNull()
    expect(pickNudge(f, at('2026-10-08'))).toEqual({ kind: 'nudge-owner', data: { tip: 'photo', dogId: 'bello', dogName: 'Bello' } })
    const once = [sent('nudge-owner', '2026-10-08', { tip: 'photo' })]
    expect(pickNudge({ ...f, sent: once }, at('2026-10-15'))).toBeNull()
    expect(pickNudge({ ...f, sent: once }, at('2026-10-18'))?.data).toMatchObject({ tip: 'slots' })
    const twice = [...once, sent('nudge-owner', '2026-10-18', { tip: 'slots' })]
    expect(pickNudge({ ...f, sent: twice }, at('2026-11-30'))).toBeNull()
  })

  it('suggests sharing when the profile is already complete', () => {
    const f = facts({ roles: owner, quietDog: { ...quiet, photos: 3, slots: 2 } })
    expect(pickNudge(f, at('2026-10-08'))?.data).toMatchObject({ tip: 'share' })
  })
})
