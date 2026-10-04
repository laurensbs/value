import { describe, expect, it } from 'vitest'
import { ignoredInARow, isNewDog, isRetiredNudge, isSeintje, newDogsNear, pickNudge, type NewDog, type NudgeFacts, type SentNudge } from './nudges'

// The daily run is at 07:30 UTC (09:30 in Amsterdam). 1 October 2026 is a Thursday.
const at = (date: string) => new Date(`${date}T07:30:00Z`)

const walker = { walker: true, owner: false }
const owner = { walker: false, owner: true }

function facts(over: Partial<NudgeFacts> = {}): NudgeFacts {
  return {
    roles: walker,
    joinedAt: at('2026-08-01'),
    walks: 0,
    steps: { about: true, dog: true, quiz: true, meet: true },
    challenge: null,
    newDogs: [],
    quietDog: null,
    lastActiveAt: at('2026-08-01'),
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

  it('never asks the same step twice and stops after three, a week apart', () => {
    // Something done after each one, so these are not three ignored in a row.
    const busy = { lastActiveAt: at('2026-10-20') }
    const one = [sent('nudge-step', '2026-10-06', { step: 'about' })]
    expect(pickNudge(newWalker({ ...busy, sent: one }), at('2026-10-12'))).toBeNull()
    expect(pickNudge(newWalker({ ...busy, sent: one }), at('2026-10-13'))?.data).toEqual({ step: 'quiz' })
    const two = [...one, sent('nudge-step', '2026-10-13', { step: 'quiz' })]
    expect(pickNudge(newWalker({ ...busy, sent: two }), at('2026-10-20'))?.data).toEqual({ step: 'meet' })
    const three = [...two, sent('nudge-step', '2026-10-20', { step: 'meet' })]
    expect(pickNudge(newWalker({ lastActiveAt: at('2026-10-21'), sent: three }), at('2026-10-27'))).toBeNull()
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
  const f = facts({ joinedAt: at('2026-10-05'), steps: { about: false, dog: false, quiz: false, meet: false } })

  it('sends nothing within seven calendar days of the last seintje, whatever its kind', () => {
    expect(pickNudge({ ...f, sent: [sent('nudge-new-dog', '2026-10-06')] }, at('2026-10-12'))).toBeNull()
    // Even when the run is a little earlier than seven full days later.
    const late = { kind: 'nudge-new-dog', at: new Date('2026-10-06T07:59:00Z'), data: {} }
    expect(pickNudge({ ...f, sent: [late] }, at('2026-10-13'))).not.toBeNull()
  })

  // Kinds that are no longer sent ("nudge-" and a name Rondje does not send any more) stay in old rows.
  it('counts kinds that are no longer sent too', () => {
    expect(pickNudge({ ...f, sent: [sent('nudge-gone', '2026-10-08')] }, at('2026-10-09'))).toBeNull()
    expect(pickNudge({ ...f, sent: [sent('nudge-old', '2026-10-08')] }, at('2026-10-14'))).toBeNull()
  })

  it('never two within seven days, on any day of the year', () => {
    const busy = facts({
      joinedAt: at('2026-10-01'),
      walks: 2,
      steps: { about: false, dog: false, quiz: false, meet: false },
      challenge: { city: 'Utrecht', goal: 50, walks: 50, mine: 1, done: true },
      newDogs: Array.from({ length: 30 }, (_, i) => ({ id: `d${i}`, name: `Dog ${i}` })),
    })
    const log: SentNudge[] = []
    for (let day = 0; day < 120; day++) {
      const now = new Date(Date.UTC(2026, 9, 1 + day, 7, 30))
      // Something done every day: only the seven days hold them back.
      const pick = pickNudge({ ...busy, sent: log, lastActiveAt: now }, now)
      if (pick) log.push({ kind: pick.kind, at: now, data: pick.data as SentNudge['data'] })
    }
    expect(log.length).toBeGreaterThan(5)
    for (let i = 1; i < log.length; i++) expect(log[i].at.getTime() - log[i - 1].at.getTime()).toBeGreaterThanOrEqual(7 * 86_400_000)
  })
})

describe('three in a row with nothing done', () => {
  const dogs = Array.from({ length: 10 }, (_, i) => ({ id: `d${i}`, name: `Dog ${i}` }))
  const f = facts({ walks: 1, newDogs: dogs, lastActiveAt: at('2026-10-01') })
  const three = [sent('nudge-new-dog', '2026-10-02', { dogId: 'x1' }), sent('nudge-new-dog', '2026-10-09', { dogId: 'x2' }), sent('nudge-step', '2026-10-16')]

  it('stop on the day the fourth would be due, not the morning after the third', () => {
    expect(ignoredInARow(three, at('2026-10-01'), at('2026-10-17'))).toBe(false)
    expect(ignoredInARow(three, at('2026-10-01'), at('2026-10-22'))).toBe(false)
    expect(ignoredInARow(three, at('2026-10-01'), at('2026-10-23'))).toBe(true)
    expect(pickNudge({ ...f, sent: three }, at('2026-10-23'))).toBeNull()
    expect(pickNudge({ ...f, sent: three }, at('2026-12-23'))).toBeNull()
  })

  it('go on when something was done after one of them', () => {
    expect(ignoredInARow(three, at('2026-10-03'), at('2026-10-23'))).toBe(false)
    expect(pickNudge({ ...f, sent: three, lastActiveAt: at('2026-10-03') }, at('2026-10-23'))?.kind).toBe('nudge-new-dog')
    // Two ignored is not three.
    expect(ignoredInARow(three.slice(1), at('2026-10-01'), at('2026-10-23'))).toBe(false)
  })

  it('only count seintjes a week apart: three closer together (as the old rules sent them) switch nobody off', () => {
    const close = [sent('nudge-step', '2026-10-02'), sent('nudge-step', '2026-10-05'), sent('nudge-challenge', '2026-10-08')]
    expect(ignoredInARow(close, at('2026-10-01'), at('2026-10-15'))).toBe(false)
    expect(pickNudge({ ...f, sent: close }, at('2026-10-15'))?.kind).toBe('nudge-new-dog')
  })

  it('only count kinds sent today: old kinds and other notifications never switch anyone off', () => {
    const old = [sent('nudge-old', '2026-10-02'), sent('nudge-gone', '2026-10-09'), sent('request-accepted', '2026-10-12'), sent('challenge-done', '2026-10-16')]
    expect(ignoredInARow(old, at('2026-10-01'), at('2026-10-30'))).toBe(false)
    // But they still count for the seven days between two seintjes.
    expect(pickNudge({ ...f, sent: [sent('nudge-old', '2026-10-20')] }, at('2026-10-23'))).toBeNull()
  })
})

describe('kinds', () => {
  it('knows the seintjes, also the ones no longer sent', () => {
    expect(isSeintje('nudge-step')).toBe(true)
    expect(isSeintje('challenge-done')).toBe(true)
    expect(isSeintje('nudge-old')).toBe(true)
    expect(isSeintje('request-reminder')).toBe(false)
    expect(isRetiredNudge('nudge-old')).toBe(true)
    expect(isRetiredNudge('nudge-gone')).toBe(true)
    expect(isRetiredNudge('nudge-owner')).toBe(false)
    expect(isRetiredNudge('walk-ended')).toBe(false)
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

describe('a new dog nearby', () => {
  const bello = { id: 'bello', name: 'Bello' }
  const max = { id: 'max', name: 'Max' }
  const f = facts({ walks: 2, newDogs: [bello, max] })

  it('tells walkers about the nearest new dog, each dog once', () => {
    expect(pickNudge(f, at('2026-10-06'))).toEqual({ kind: 'nudge-new-dog', data: { dogId: 'bello', dogName: 'Bello' } })
    const told = [sent('nudge-new-dog', '2026-10-06', { dogId: 'bello' })]
    expect(pickNudge({ ...f, newDogs: [bello], sent: told }, at('2026-10-13'))).toBeNull()
    expect(pickNudge({ ...f, sent: told }, at('2026-10-13'))?.data).toEqual({ dogId: 'max', dogName: 'Max' })
  })

  it('at most once a week, and not to owners who do not walk', () => {
    const told = [sent('nudge-new-dog', '2026-10-06', { dogId: 'bello' })]
    expect(pickNudge({ ...f, sent: told }, at('2026-10-12'))).toBeNull()
    expect(pickNudge({ ...f, roles: owner }, at('2026-10-06'))).toBeNull()
  })
})

describe('a new dog', () => {
  it('is new for a week after it came online, and an example dog never is', () => {
    const dog = { createdAt: at('2026-10-01'), isDemo: false }
    expect(isNewDog(dog, at('2026-10-07'))).toBe(true)
    expect(isNewDog(dog, at('2026-10-08'))).toBe(false)
    expect(isNewDog({ ...dog, isDemo: true }, at('2026-10-02'))).toBe(false)
  })
})

describe('which new dogs are near', () => {
  const utrecht = { lat: 52.09, lng: 5.12 }
  const walker = { userId: 'w', country: 'NL', town: 'utrecht', ...utrecht, pppLicense: false }
  const dog = (id: string, over: Partial<NewDog> = {}): NewDog => ({ id, name: id, ownerId: `o-${id}`, country: 'NL', town: 'utrecht', ...utrecht, ppp: false, ...over })
  const none = { asked: new Set<string>(), blocked: new Set<string>() }
  const ids = (dogs: { id: string }[]) => dogs.map((d) => d.id)

  it('keeps dogs within 5 km, nearest first', () => {
    // 0.01° latitude is about 1.1 km.
    const dogs = [dog('far', { lat: 52.15 }), dog('near', { lat: 52.1 }), dog('here'), dog('amersfoort', { lat: 52.16, lng: 5.39, town: 'amersfoort' })]
    expect(ids(newDogsNear(walker, dogs, none))).toEqual(['here', 'near'])
  })

  it('uses the town when a location is missing', () => {
    const dogs = [dog('town', { lat: null, lng: null }), dog('other', { lat: null, lng: null, town: 'zeist' }), dog('es', { lat: null, lng: null, country: 'ES' })]
    expect(ids(newDogsNear(walker, dogs, none))).toEqual(['town'])
    expect(ids(newDogsNear({ ...walker, lat: null, lng: null }, [dog('here'), dog('zeist', { town: 'zeist' })], none))).toEqual(['here'])
  })

  it('leaves out their own dogs, dogs they asked about and blocked owners', () => {
    const dogs = [dog('own', { ownerId: 'w' }), dog('asked'), dog('blocked'), dog('free')]
    expect(ids(newDogsNear(walker, dogs, { asked: new Set(['asked']), blocked: new Set(['o-blocked']) }))).toEqual(['free'])
  })

  it('needs the licence for a PPP dog in Spain', () => {
    const spain = { ...walker, country: 'ES' }
    const dogs = [dog('ppp', { country: 'ES', ppp: true })]
    expect(newDogsNear(spain, dogs, none)).toEqual([])
    expect(ids(newDogsNear({ ...spain, pppLicense: true }, dogs, none))).toEqual(['ppp'])
  })
})

describe('owners', () => {
  const quiet = { id: 'bello', name: 'Bello', since: at('2026-10-01'), walkersNear: 1 }

  it('hear once per dog that walkers are still few, a week after it came online without a request', () => {
    const f = facts({ roles: owner, quietDog: quiet })
    expect(pickNudge(f, at('2026-10-07'))).toBeNull()
    expect(pickNudge(f, at('2026-10-08'))).toEqual({ kind: 'nudge-owner', data: { dogId: 'bello', dogName: 'Bello' } })
    const once = [sent('nudge-owner', '2026-10-08', { dogId: 'bello' })]
    expect(pickNudge({ ...f, sent: once, lastActiveAt: at('2026-10-09') }, at('2026-11-30'))).toBeNull()
    // Another quiet dog is another message, a week later at the soonest.
    const luna = { ...quiet, id: 'luna', name: 'Luna' }
    expect(pickNudge({ ...f, quietDog: luna, sent: once, lastActiveAt: at('2026-10-09') }, at('2026-10-15'))?.data).toEqual({ dogId: 'luna', dogName: 'Luna' })
  })

  it('hear nothing when enough walkers live nearby: then it would not be true', () => {
    expect(pickNudge(facts({ roles: owner, quietDog: { ...quiet, walkersNear: 3 } }), at('2026-10-08'))).toBeNull()
  })
})
