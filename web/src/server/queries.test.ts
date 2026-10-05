import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))

const { getDogDetail, incomingRequests, listDogs, notificationsFor, outgoingRequests, unreadCount, unreadCounts, walkersNear } = await import('./queries')

async function viewer(userId: string) {
  const p = await db.query.profile.findFirst({ where: (t, { eq }) => eq(t.userId, userId) })
  return { userId, email: `${userId}@example.org`, name: userId, image: null, isAdmin: false, adminUnconfirmed: false, orgs: [], profile: p! }
}

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('ans', 'Ans', 'ans@example.org', false, now(), now()),
      ('fleur', 'Fleur', 'fleur@example.org', false, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, phone)
    values
      ('ans', 'Ans', '1951-04-02', 'NL', 'Utrecht', now(), '1', 'ANS234', '0612345678'),
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', now(), '1', 'FLE234', '0687654321');
    insert into dog (id, owner_id, name, country, city, meeting_info, vet_info, chip_number)
      values ('bello', 'ans', 'Bello', 'NL', 'Utrecht', 'Bel aan bij nummer 12', 'Dierenarts Oost', '528140000000001');
    insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min, status)
      values ('r1', 'bello', 'fleur', 'meet', now() - interval '2 days', 30, 'completed');
  `)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('a block after a walk', () => {
  it('first: after a walk together both sides see the details', async () => {
    const detail = await getDogDetail('bello', await viewer('fleur'))
    expect(detail?.canSeePrivate).toBe(true)
    expect(detail?.dog.meetingInfo).toBe('Bel aan bij nummer 12')
    expect(detail?.host.phone).toBe('0612345678')
    const [incoming] = await incomingRequests(await viewer('ans'))
    expect(incoming.blocked).toBe(false)
    expect(incoming.walker.phone).toBe('0687654321')
  })

  it('then: once either side blocks, neither sees the other’s number, email or meeting place', async () => {
    await client.exec(`insert into block (blocker_id, blocked_id) values ('ans', 'fleur')`)

    const detail = await getDogDetail('bello', await viewer('fleur'))
    expect(detail?.canSeePrivate).toBe(false)
    expect(detail?.dog.meetingInfo).toBe('')
    expect(detail?.dog.vetInfo).toBe('')
    expect(detail?.dog.chipNumber).toBe('')
    expect(detail?.host.phone).toBeNull()
    expect(detail?.host.email).toBeNull()

    const [outgoing] = await outgoingRequests('fleur')
    expect(outgoing.blocked).toBe(true)
    expect(outgoing.dog.meetingInfo).toBe('')
    // Your own details stay yours.
    expect(outgoing.walker.phone).toBe('0687654321')

    const [incoming] = await incomingRequests(await viewer('ans'))
    expect(incoming.blocked).toBe(true)
    expect(incoming.walker.phone).toBeNull()
    expect(incoming.walker.email).toBe('')
  })
})

describe('walkers near a place', () => {
  beforeAll(async () => {
    await client.exec(`
      insert into "user" (id, name, email, email_verified, created_at, updated_at) values
        ('w1', 'W1', 'w1@example.org', false, now(), now()), ('w2', 'W2', 'w2@example.org', false, now(), now()),
        ('w3', 'W3', 'w3@example.org', false, now(), now()), ('w4', 'W4', 'w4@example.org', false, now(), now()),
        ('w5', 'W5', 'w5@example.org', false, now(), now()), ('w6', 'W6', 'w6@example.org', false, now(), now()),
        ('w7', 'W7', 'w7@example.org', false, now(), now());
      insert into profile (user_id, first_name, birth_date, country, city, lat, lng, wants_to_walk, banned_at, terms_accepted_at, terms_version, referral_code)
      values
        ('w1', 'W1', '1990-01-01', 'NL', 'Utrecht', 52.09, 5.12, true, null, now(), '1', 'WAA001'),
        ('w2', 'W2', '1990-01-01', 'NL', 'Utrecht', 52.1, 5.12, true, null, now(), '1', 'WAA002'),
        ('w3', 'W3', '1990-01-01', 'NL', 'Utrecht', 52.2, 5.12, true, null, now(), '1', 'WAA003'),
        ('w4', 'W4', '1990-01-01', 'NL', ' utrecht', null, null, true, null, now(), '1', 'WAA004'),
        ('w5', 'W5', '1990-01-01', 'NL', 'Zeist', null, null, true, null, now(), '1', 'WAA005'),
        ('w6', 'W6', '1990-01-01', 'NL', 'Utrecht', 52.09, 5.12, false, null, now(), '1', 'WAA006'),
        ('w7', 'W7', '1990-01-01', 'NL', 'Utrecht', 52.09, 5.12, true, now(), now(), '1', 'WAA007');
    `)
  })

  it('counts those within 5 km, and those in the same town without a location', async () => {
    // Fleur lives in Utrecht without a location; W3 is 12 km away; W5 lives in Zeist; W6 does not walk; W7 is banned.
    expect(await walkersNear({ country: 'NL', city: 'Utrecht', lat: 52.09, lng: 5.12 }, 'ans')).toBe(4)
    expect(await walkersNear({ country: 'NL', city: 'Utrecht', lat: 52.09, lng: 5.12 }, 'w1')).toBe(4)
  })

  it('goes by the town when the place itself has no location', async () => {
    expect(await walkersNear({ country: 'NL', city: 'Utrecht', lat: null, lng: null }, 'ans')).toBe(5)
    expect(await walkersNear({ country: 'BE', city: 'Utrecht', lat: null, lng: null }, 'ans')).toBe(0)
  })
})

describe('notifications', () => {
  it('leave out seintje kinds that are no longer sent, everywhere; seintjes are not about a walk', async () => {
    await client.exec(`
      insert into notification (id, user_id, kind, data, created_at) values
        ('n1', 'fleur', 'request-accepted', '{"dogName":"Bello"}', now() - interval '3 days'),
        ('n2', 'fleur', 'nudge-step', '{"step":"quiz"}', now() - interval '2 days'),
        ('n3', 'fleur', 'challenge-done', '{"city":"Utrecht","goal":10,"mine":1}', now() - interval '1 day'),
        -- An old row of a kind Rondje no longer sends: it has no text any more.
        ('n4', 'fleur', 'nudge-old', '{"left":1}', now()),
        -- An owner tip from before: today's text would claim something nobody checked then.
        ('n5', 'fleur', 'nudge-owner', '{"tip":"photo","dogId":"bello","dogName":"Bello"}', now() - interval '4 days'),
        ('n6', 'fleur', 'nudge-owner', '{"dogId":"bello","dogName":"Bello"}', now() - interval '5 days');
    `)
    expect((await notificationsFor('fleur')).map((n) => n.id)).toEqual(['n3', 'n2', 'n1', 'n6'])
    expect(await unreadCounts('fleur')).toEqual({ all: 4, walks: 1 })
    expect(await unreadCount('fleur')).toBe(4)
    expect(await unreadCount('fleur', { reminders: false })).toBe(1)
  })
})

describe('a private owner, seen without an account (DPIA maatregel M4)', () => {
  beforeAll(async () => {
    await client.exec(`
      update profile set bio = 'Ik ben Ans en ik woon hier al veertig jaar.', photo_url = 'https://example.org/ans.jpg' where user_id = 'ans';
      update dog set lat = 52.095, lng = 5.13, status = 'active' where id = 'bello';
      insert into dog_slot (id, dog_id, weekday, time) values ('bello-1', 'bello', 2, '07:45');
      insert into organization (id, name, country, city, status, description) values ('zuid', 'Opvang Zuid', 'NL', 'Utrecht', 'verified', 'Wij wandelen op zaterdag.');
      insert into dog (id, org_id, name, country, city, lat, lng) values ('rex', 'zuid', 'Rex', 'NL', 'Utrecht', 52.07, 5.14);
    `)
  })

  it('shows the dog, its town and an owner nearby: not who the owner is, when the dog walks, or its spot', async () => {
    const detail = await getDogDetail('bello', null)
    expect(detail?.ownerShielded).toBe(true)
    expect(detail?.dog.name).toBe('Bello')
    expect(detail?.host).toMatchObject({ kind: 'owner', name: '', photoUrl: null, city: 'Utrecht', phone: null, email: null })
    expect(detail?.host.bio).toBeUndefined()
    expect(detail?.slots).toEqual([])
    expect([detail?.dog.lat, detail?.dog.lng]).toEqual([null, null])
    expect(JSON.stringify(detail)).not.toMatch(/Ans|veertig|ans\.jpg|07:45|52\.095/)
  })

  it('signed in, the same page shows the owner as before', async () => {
    const detail = await getDogDetail('bello', await viewer('fleur'))
    expect(detail?.ownerShielded).toBe(false)
    expect(detail?.host).toMatchObject({ name: 'Ans', photoUrl: 'https://example.org/ans.jpg', bio: 'Ik ben Ans en ik woon hier al veertig jaar.' })
    expect(detail?.slots).toEqual([{ weekday: 2, time: '07:45' }])
    expect(detail?.dog.lat).toBe(52.095)
  })

  it('a bare account is not enough: without onboarding, or when banned, the owner stays shielded', async () => {
    const fleur = await viewer('fleur')
    const [bare, banned] = await Promise.all([
      getDogDetail('bello', { ...fleur, profile: null }),
      getDogDetail('bello', { ...fleur, profile: { ...fleur.profile, bannedAt: new Date() } }),
    ])
    for (const detail of [bare, banned]) {
      expect(detail?.ownerShielded).toBe(true)
      expect(detail?.slots).toEqual([])
      expect(JSON.stringify(detail)).not.toMatch(/veertig|ans\.jpg|07:45|52\.095/)
    }
  })

  it('leaves a shelter dog as it is', async () => {
    const [visitor, member] = await Promise.all([getDogDetail('rex', null), getDogDetail('rex', await viewer('fleur'))])
    expect(visitor?.ownerShielded).toBe(false)
    expect(visitor?.host).toEqual(member?.host)
    expect(visitor?.host).toMatchObject({ kind: 'shelter', name: 'Opvang Zuid', bio: 'Wij wandelen op zaterdag.' })
    expect(visitor?.dog.lat).toBe(52.07)
  })

  it('in the list of dogs too: no owner name or photo, and no spot on the map', async () => {
    const near = { lat: 52.09, lng: 5.12 }
    const visitor = await listDogs({ country: 'NL', near, visitor: true })
    const bello = visitor.find((i) => i.dog.id === 'bello')!
    expect(bello.host).toEqual({ kind: 'owner', id: 'ans', name: '', photoUrl: null, city: 'Utrecht', verified: false })
    expect([bello.dog.lat, bello.dog.lng]).toEqual([null, null])
    // Still nearest first, from the spot the visitor cannot see.
    expect(bello.distanceM).toBeGreaterThan(0)
    expect(visitor.find((i) => i.dog.id === 'rex')?.dog.lat).toBe(52.07)

    const member = (await listDogs({ country: 'NL', near })).find((i) => i.dog.id === 'bello')!
    expect(member.host).toMatchObject({ name: 'Ans', photoUrl: 'https://example.org/ans.jpg' })
    expect(member.dog.lat).toBe(52.095)
  })
})
