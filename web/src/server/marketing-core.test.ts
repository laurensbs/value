import { describe, expect, it } from 'vitest'
import {
  answers,
  demand,
  funnel,
  newMembers,
  ownersDog,
  QUESTION_IDS,
  referrals,
  requests,
  returning,
  shelterPipeline,
  thisWeek,
  traffic,
  walkersWaiting,
  wantedShelter,
  type DogRow,
  type MarketingFacts,
  type MemberRow,
} from './marketing-core'

const NOW = new Date('2026-10-03T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60_000)

const empty = (): MarketingFacts => ({
  accounts: [],
  members: [],
  dogs: [],
  requests: [],
  walks: [],
  votes: [],
  groupSignups: [],
  orgs: [],
  contacts: [],
  adminCodes: [],
  analyticsOn: false,
})

const member = (id: string, extra: Partial<MemberRow> = {}): MemberRow => ({
  id,
  at: daysAgo(1),
  demo: false,
  admin: false,
  walker: true,
  owner: false,
  banned: false,
  country: 'NL',
  city: 'Utrecht',
  lat: 52.09,
  lng: 5.12,
  referredBy: null,
  referralCode: `C${id.toUpperCase()}`.slice(0, 6),
  ...extra,
})

const dog = (id: string, extra: Partial<DogRow> = {}): DogRow => ({
  id,
  ownerId: null,
  orgId: null,
  status: 'active',
  live: true,
  demo: false,
  country: 'NL',
  city: 'Utrecht',
  lat: 52.09,
  lng: 5.12,
  ...extra,
})

describe('the best questions, from plain rows', () => {
  it('answers every question in a fixed order, and waits when there is no data', () => {
    const list = answers(empty(), NOW)
    expect(list.map((a) => a.id)).toEqual([...QUESTION_IDS])
    // Without any data, two things can still be done this week: mail shelters, and start counting visits.
    expect(thisWeek(list).map((a) => a.id)).toEqual(['shelterPipeline', 'traffic'])
    expect(list.filter((a) => !['shelterPipeline', 'traffic'].includes(a.id)).every((a) => a.status === 'wait')).toBe(true)
  })

  it('never counts example data or admins', () => {
    const f = empty()
    f.members = [member('demo-ans', { demo: true }), member('admin', { admin: true }), member('fleur')]
    f.accounts = f.members.map((m) => ({ id: m.id, at: m.at, demo: m.demo, admin: m.admin, hasProfile: true }))
    expect(newMembers(f, NOW).values).toMatchObject({ thisWeek: 1, total: 1 })
    expect(funnel(f).steps?.[0]).toEqual({ key: 'account', n: 1 })
    expect(walkersWaiting(f).values).toMatchObject({ walkers: 1, waiting: 1 })
  })

  it('funnel: the biggest leak is where most people stay behind', () => {
    const f = empty()
    f.members = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => member(id))
    f.accounts = [...f.members.map((m) => ({ id: m.id, at: m.at, demo: false, hasProfile: true })), { id: 'x', at: NOW, demo: false, hasProfile: false }]
    f.requests = [{ walkerId: 'a', ownerId: 'o', status: 'pending', at: NOW, demo: false }]
    const a = funnel(f)
    expect(a.steps?.map((s) => s.n)).toEqual([7, 6, 1, 0])
    // 5 of 6 stop after their profile: a bigger leak than 0 of 1 walking.
    expect(a).toMatchObject({ status: 'act', action: 'firstStep', labels: { from: 'step.profile', to: 'step.firstStep' }, values: { pct: 17 } })
  })

  it('new members: this week against last week', () => {
    const f = empty()
    f.members = [member('a', { at: daysAgo(2) }), member('b', { at: daysAgo(3), walker: false, owner: true }), member('c', { at: daysAgo(9) })]
    expect(newMembers(f, NOW)).toMatchObject({ status: 'good', variant: 'up', values: { thisWeek: 2, lastWeek: 1, walkers: 1, owners: 1 } })
    f.members = [member('c', { at: daysAgo(9) })]
    expect(newMembers(f, NOW)).toMatchObject({ status: 'act', variant: 'down', action: 'push' })
    f.members = [member('c', { at: daysAgo(30) })]
    expect(newMembers(f, NOW)).toMatchObject({ status: 'act', variant: 'none', action: 'start' })
  })

  it('demand: the town with most people wanting to walk and fewest dogs comes first', () => {
    const f = empty()
    f.members = [member('a', { city: 'Amsterdam' }), member('b', { city: 'Amsterdam' }), member('c'), member('d', { walker: false, owner: true })]
    // A vote counts as demand in the shelter's town, each person once.
    f.votes = [
      { voterId: 'a', key: 'nl-doa', name: 'Opvang Amsterdam', city: 'Amsterdam', country: 'NL', demo: false },
      { voterId: 'z', key: 'nl-doa', name: 'Opvang Amsterdam', city: 'Amsterdam', country: 'NL', demo: false },
      { voterId: 'demo-x', key: 'nl-doa', name: 'Opvang Amsterdam', city: 'Amsterdam', country: 'NL', demo: true },
    ]
    f.dogs = [dog('bello'), dog('demo-saar', { demo: true, city: 'Amsterdam' }), dog('draft', { status: 'draft', live: false, city: 'Amsterdam' })]
    const a = demand(f)
    expect(a).toMatchObject({ status: 'act', action: 'supply', values: { city: 'Amsterdam', demand: 3, supply: 0 }, href: '/cities/amsterdam' })
    expect(a.rows).toEqual([
      { label: 'Amsterdam', value: 3, extra: 0, href: '/cities/amsterdam' },
      { label: 'Utrecht', value: 1, extra: 1, href: '/cities/utrecht' },
    ])
  })

  it('wanted shelter: most voters first, and whether it was contacted already', () => {
    const f = empty()
    f.votes = [
      { voterId: 'a', key: 'nl-doa', name: 'Dierenopvangcentrum Amsterdam (DOA)', city: 'Amsterdam', country: 'NL', demo: false },
      { voterId: 'b', key: 'nl-doa', name: 'Dierenopvangcentrum Amsterdam (DOA)', city: 'Amsterdam', country: 'NL', demo: false },
      { voterId: 'b', key: 'nl-doa', name: 'Dierenopvangcentrum Amsterdam (DOA)', city: 'Amsterdam', country: 'NL', demo: false },
      { voterId: 'c', key: 'nl-zwolle', name: 'Dierenasiel Zwolle', city: 'Zwolle', country: 'NL', demo: false },
      { voterId: 'admin', key: 'nl-zwolle', name: 'Dierenasiel Zwolle', city: 'Zwolle', country: 'NL', demo: false, admin: true },
    ]
    expect(wantedShelter(f)).toMatchObject({ status: 'act', action: 'mail', values: { name: 'Dierenopvangcentrum Amsterdam (DOA)', n: 2 } })
    expect(wantedShelter(f).rows?.map((r) => r.value)).toEqual([2, 1])
    f.contacts = [{ audience: 'shelter', status: 'sent', organisation: 'Stichting Dierenopvangcentrum Amsterdam DOA' }]
    expect(wantedShelter(f)).toMatchObject({ status: 'watch', action: 'follow' })
  })

  it('shelter pipeline: a waiting sign-up first, then mails until there are ten', () => {
    const f = empty()
    f.contacts = [
      { audience: 'shelter', status: 'sent', organisation: 'A' },
      { audience: 'shelter', status: 'replied', organisation: 'B' },
      { audience: 'shelter', status: 'todo', organisation: 'C' },
      { audience: 'vet', status: 'sent', organisation: 'D' },
    ]
    expect(shelterPipeline(f)).toMatchObject({ status: 'act', action: 'send', values: { todo: 1, sent: 2, replied: 1, meeting: 0, missing: 8 } })
    f.orgs = [{ createdBy: 'x', status: 'pending', demo: false }, { createdBy: null, status: 'verified', demo: true }]
    expect(shelterPipeline(f)).toMatchObject({ status: 'act', action: 'review', values: { pending: 1, live: 0 } })
    f.orgs = [{ createdBy: 'x', status: 'verified', demo: false }]
    expect(shelterPipeline(f)).toMatchObject({ status: 'good', action: 'firstWalk' })
  })

  it('owners: how many put a dog online', () => {
    const f = empty()
    f.members = [member('o1', { walker: false, owner: true }), member('o2', { walker: false, owner: true })]
    f.dogs = [dog('bello', { ownerId: 'o1' }), dog('draft', { ownerId: 'o2', status: 'draft', live: false })]
    expect(ownersDog(f)).toMatchObject({ status: 'act', action: 'help', values: { withDog: 1, owners: 2, without: 1, pct: 50 } })
  })

  it('walkers waiting: no real dog within 5 km (or in the same town without a location)', () => {
    const f = empty()
    f.members = [member('a'), member('b', { city: 'Amsterdam', lat: 52.37, lng: 4.89 }), member('c', { city: 'Utrecht', lat: null, lng: null })]
    f.dogs = [dog('bello'), dog('demo-mo', { demo: true, city: 'Amsterdam', lat: 52.37, lng: 4.89 })]
    expect(walkersWaiting(f)).toMatchObject({ status: 'watch', variant: 'waiting', values: { waiting: 1, walkers: 3, city: 'Amsterdam', km: 5 } })
  })

  it('requests: the ones waiting longer than two days', () => {
    const f = empty()
    f.requests = [
      { walkerId: 'a', ownerId: 'o', status: 'pending', at: daysAgo(3), demo: false },
      { walkerId: 'b', ownerId: 'o', status: 'pending', at: daysAgo(1), demo: false },
      { walkerId: 'c', ownerId: 'o', status: 'accepted', at: daysAgo(5), demo: false },
      { walkerId: 'd', ownerId: 'demo-ans', status: 'pending', at: daysAgo(9), demo: true },
    ]
    expect(requests(f, NOW)).toMatchObject({ status: 'act', action: 'chase', values: { total: 3, accepted: 1, pending: 2, stale: 1 } })
  })

  it('returning walkers and steady pairs', () => {
    const f = empty()
    const walk = (walkerId: string, dogId: string, days: number) => ({ walkerId, dogId, ownerId: 'o', at: daysAgo(days), demo: false })
    f.walks = [walk('a', 'bello', 1), walk('a', 'bello', 8), walk('a', 'bello', 15), walk('b', 'bello', 2), walk('c', 'max', 3), walk('c', 'max', 100)]
    expect(returning(f, NOW)).toMatchObject({ status: 'good', values: { once: 3, again: 2, steady: 1, pct: 67 } })
  })

  it('referrals: own link, other members and campaign codes; members’ codes are never listed', () => {
    const f = empty()
    f.members = [
      member('admin', { admin: true, referralCode: 'ADM234' }),
      member('a', { referralCode: 'AAA234' }),
      member('b', { referredBy: 'ADM234' }),
      member('c', { referredBy: 'aaa234' }),
      member('d', { referredBy: 'FLBIBLIOTHE' }),
      member('e', { referredBy: 'FLBIBLIOTHE' }),
      member('f'),
    ]
    f.adminCodes = ['ADM234']
    const a = referrals(f)
    expect(a.values).toMatchObject({ referred: 4, members: 6, pct: 67, own: 1, viaMembers: 1, viaCodes: 2 })
    expect(a.rows).toEqual([{ label: 'FLBIBLIOTHE', value: 2 }])
  })

  it('traffic: asks to switch Web Analytics on until it is ticked off', () => {
    expect(traffic(empty())).toMatchObject({ status: 'act', action: 'enable' })
    expect(traffic({ ...empty(), analyticsOn: true })).toMatchObject({ status: 'watch', action: 'check' })
  })
})
