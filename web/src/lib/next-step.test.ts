import { describe, expect, it } from 'vitest'
import { closeStep, isNight, isPutAway, LATER_DAYS, nextSteps, pickStep, putLater, type NextStepAppointment, type NextStepFacts } from './next-step'
import data from './next-step.scenarios.json'

type JsonAppointment = Partial<Omit<NextStepAppointment, 'dog' | 'startsAt'>> & { id: string; dog: { id: string; name: string; isDemo?: boolean }; startsInMin: number }
type JsonFacts = Partial<Omit<NextStepFacts, 'now' | 'outgoing' | 'incoming' | 'ownDogs' | 'staffOrg'>> & {
  outgoing?: JsonAppointment[]
  incoming?: JsonAppointment[]
  ownDogs?: { id: string; name: string; status: string; orgId?: string | null; isDemo?: boolean }[]
  staffOrg?: { id: string; name: string; nextGroupWalkInMin: number | null }
}
interface Scenario {
  name: string
  now?: string
  facts: JsonFacts
  expect: string
  kinds?: string[]
  dog?: string
  id?: string
  href?: string | null
  via?: string
}

/** A scenario from the JSON file as the facts the function gets, with the defaults the file describes. */
function factsOf(s: Scenario): NextStepFacts {
  const now = new Date(s.now ?? data.now)
  const appointment = (a: JsonAppointment): NextStepAppointment => ({
    walkerId: 'w1',
    walkerName: 'Sam',
    kind: 'meet',
    meetVia: 'walk',
    status: 'accepted',
    durationMin: 45,
    weekly: false,
    walkId: null,
    walkStatus: null,
    feedbackGiven: false,
    ...a,
    dog: { isDemo: false, ...a.dog },
    startsAt: new Date(now.getTime() + a.startsInMin * 60_000),
  })
  const f = s.facts
  return {
    now,
    userId: 'me',
    walker: f.walker ?? false,
    owner: f.owner ?? false,
    quizPassed: f.quizPassed ?? false,
    ownDogs: (f.ownDogs ?? []).map((d) => ({ orgId: null, isDemo: false, ...d })),
    outgoing: (f.outgoing ?? []).map(appointment),
    incoming: (f.incoming ?? []).map(appointment),
    trust: f.trust ?? {},
    nearby: f.nearby ?? [],
    wantsToWalk: f.wantsToWalk,
    staffOrg: f.staffOrg
      ? { id: f.staffOrg.id, name: f.staffOrg.name, nextGroupWalk: f.staffOrg.nextGroupWalkInMin == null ? null : new Date(now.getTime() + f.staffOrg.nextGroupWalkInMin * 60_000) }
      : null,
  }
}

const scenarios = data.scenarios as Scenario[]

describe('Eén ding nu: the scenarios (next-step.scenarios.json)', () => {
  for (const s of scenarios) {
    it(s.name, () => {
      const steps = nextSteps(factsOf(s))
      expect(steps[0].kind).toBe(s.expect)
      if (s.kinds) expect(steps.map((step) => step.kind)).toEqual(s.kinds)
      if (s.dog) expect(steps[0].dog).toBe(s.dog)
      if (s.id) expect(steps[0].id).toBe(s.id)
      if (s.href !== undefined) expect(steps[0].href).toBe(s.href)
      if (s.via) expect(steps[0].via).toBe(s.via)
    })
  }

  it('always ends in a step that cannot be put away', () => {
    for (const s of scenarios) {
      const last = nextSteps(factsOf(s)).at(-1)!
      expect(last.later || last.dismiss, s.name).toBe(false)
    }
  })

  it('never makes a step of an example dog', () => {
    for (const s of scenarios) {
      const f = factsOf(s)
      const demo = [...f.nearby.filter((d) => d.isDemo), ...f.ownDogs.filter((d) => d.isDemo), ...[...f.outgoing, ...f.incoming].map((a) => a.dog).filter((d) => d.isDemo)]
      for (const step of nextSteps(f)) {
        for (const d of demo) {
          expect(step.href ?? '', s.name).not.toContain(d.id)
          expect(step.dog, s.name).not.toBe(d.name)
        }
      }
    }
  })

  it('has no weekly-goal step that counts down', () => {
    for (const s of scenarios) expect(nextSteps(factsOf(s)).map((step) => step.kind)).not.toContain('goal')
  })
})

describe('live location switched off (LIVE_LOCATION)', () => {
  const now = new Date(data.now)
  const soon = (id: string, kind: string): NextStepAppointment => ({
    id,
    dog: { id: `dog-${id}`, name: id === 'solo' ? 'Pip' : 'Bello', isDemo: false },
    walkerId: 'me',
    walkerName: 'Sam',
    kind,
    meetVia: 'walk',
    status: 'accepted',
    startsAt: new Date(now.getTime() + 10 * 60_000),
    durationMin: 45,
    weekly: false,
    walkId: null,
    walkStatus: null,
    feedbackGiven: false,
  })
  const facts = (over: Partial<NextStepFacts>): NextStepFacts => ({
    now,
    userId: 'me',
    walker: true,
    owner: false,
    quizPassed: true,
    ownDogs: [],
    outgoing: [],
    incoming: [],
    trust: {},
    nearby: [],
    ...over,
  })

  it('offers no "Klaar voor?" for a walk alone that cannot start; walking together can', () => {
    const outgoing = [soon('solo', 'solo'), soon('meet', 'meet')]
    const off = nextSteps(facts({ outgoing, liveLocation: false })).filter((step) => step.kind === 'start')
    expect(off.map((step) => step.id)).toEqual(['start.meet'])
    const on = nextSteps(facts({ outgoing, liveLocation: true })).filter((step) => step.kind === 'start')
    expect(on.map((step) => step.id).sort()).toEqual(['start.meet', 'start.solo'])
    // Left out: on, as before (the scenarios shared with the iPhone app).
    expect(nextSteps(facts({ outgoing })).filter((step) => step.kind === 'start')).toHaveLength(2)
  })

  it('calls following your dog live only for a walk that shares location', () => {
    const walking = (kind: string) => ({ ...soon(kind, kind), walkerId: 'w1', walkId: `walk-${kind}`, walkStatus: 'active' })
    const own = (kind: string, liveLocation: boolean) =>
      nextSteps(facts({ walker: false, owner: true, incoming: [walking(kind)], liveLocation })).find((step) => step.kind === 'liveOwn')
    expect(own('solo', true)?.live).toBe(true)
    expect(own('solo', false)?.live).toBe(false)
    expect(own('meet', true)?.live).toBe(false)
  })
})

describe('the night (23:00 to 06:00, Dutch time)', () => {
  const at = (iso: string) => isNight(new Date(iso))

  it('starts at 23:00 and ends at 06:00, summer and winter time alike', () => {
    expect(at('2026-10-05T22:59:00+02:00')).toBe(false)
    expect(at('2026-10-05T23:00:00+02:00')).toBe(true)
    expect(at('2026-10-06T03:00:00+02:00')).toBe(true)
    expect(at('2026-10-06T05:59:00+02:00')).toBe(true)
    expect(at('2026-10-06T06:00:00+02:00')).toBe(false)
    expect(at('2026-12-15T22:30:00Z')).toBe(true) // 23:30 in Amsterdam (winter time)
    expect(at('2026-12-15T05:30:00Z')).toBe(false) // 06:30 in Amsterdam
  })

  it('never hides what happens right now, and always leaves something to do', () => {
    for (const s of scenarios.filter((x) => x.now && isNight(new Date(x.now)))) {
      const steps = nextSteps(factsOf(s))
      const live = steps.findIndex((step) => step.kind === 'live' || step.kind === 'liveOwn')
      if (live >= 0) expect(live, s.name).toBe(0)
      const last = steps.at(-1)!
      if (last.kind === 'night' && factsOf(s).walker) expect(last.href, s.name).toBe('/school')
    }
  })
})

describe('Later and "Nee, nu niet"', () => {
  const day = 86_400_000
  const t0 = Date.UTC(2026, 9, 5, 8)
  const steps = [
    { id: 'quiz', later: true, dismiss: false },
    { id: 'debrief.bello.w1', later: false, dismiss: true },
    { id: 'done', later: false, dismiss: false },
  ]

  it('puts a step away for a week, then it comes back', () => {
    const store = putLater({}, 'quiz', t0)
    expect(isPutAway(store, 'quiz', t0 + 1000)).toBe(true)
    expect(isPutAway(store, 'quiz', t0 + LATER_DAYS * day - 1000)).toBe(true)
    expect(isPutAway(store, 'quiz', t0 + LATER_DAYS * day + 1000)).toBe(false)
    expect(pickStep(steps, store, t0 + 1000)?.id).toBe('debrief.bello.w1')
    expect(pickStep(steps, store, t0 + 8 * day)?.id).toBe('quiz')
  })

  it('after twice "Later" the step does not come back', () => {
    const twice = putLater(putLater({}, 'quiz', t0), 'quiz', t0 + 8 * day)
    expect(isPutAway(twice, 'quiz', t0 + 365 * day)).toBe(true)
  })

  it('"Nee, nu niet" closes a talk-over for good', () => {
    const store = closeStep({}, 'debrief.bello.w1')
    expect(pickStep(steps, store, t0)?.id).toBe('quiz')
    expect(pickStep(steps, putLater(store, 'quiz', t0), t0 + day)?.id).toBe('done')
    expect(isPutAway(store, 'debrief.bello.w1', t0 + 365 * day)).toBe(true)
  })

  it('never hides a step that cannot be put away', () => {
    const store = putLater(putLater({}, 'done', t0), 'done', t0)
    expect(pickStep([{ id: 'done', later: false, dismiss: false }], store, t0)?.id).toBe('done')
  })
})
