import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'
import { toZonedParts } from '@/lib/time'

const client = new PGlite()
const db = drizzle({ client, schema })

// Who is signed in, per test: the walker Fleur or the owner Ans.
let current = 'fleur'
async function viewer(userId: string) {
  const p = await db.query.profile.findFirst({ where: (t, { eq }) => eq(t.userId, userId) })
  return { userId, email: `${userId}@example.org`, name: userId, image: null, isAdmin: false, adminUnconfirmed: false, orgs: [], profile: p! }
}

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
vi.mock('@/db', () => ({ getDb: async () => db }))
const notify = vi.fn(async () => {})
vi.mock('../notify', () => ({ notify, audit: async () => {} }))
vi.mock('../session', () => ({
  actionViewer: async () => {
    if (current === 'nobody') throw new Error('not-signed-in')
    return viewer(current)
  },
  isOrgMember: (v: { orgs: { id: string }[] }, orgId: string | null) => Boolean(orgId && v.orgs.some((o) => o.id === orgId)),
}))

const { createRequest, respondToRequest, setTrust } = await import('./requests')
const { beginWalk, finishWalk } = await import('../walks')
const { relationFor } = await import('../queries')

async function dog(id: string) {
  return (await db.query.dog.findFirst({ where: (t, { eq }) => eq(t.id, id) }))!
}

/** A request for tomorrow at 10:00, as the form or the app sends it. */
function form(fields: Record<string, string>) {
  const tomorrow = toZonedParts(new Date(Date.now() + 24 * 3_600_000)).date
  const f = new FormData()
  for (const [key, value] of Object.entries({ kind: 'meet', date: tomorrow, time: '10:00', message: '', ...fields })) f.set(key, value)
  return f
}

async function requestsOf(dogId: string) {
  const rows = await client.query<{ id: string; kind: string; meet_via: string; status: string }>(
    'select id, kind, meet_via, status from walk_request where dog_id = $1 order by created_at',
    [dogId],
  )
  return rows.rows
}

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('ans', 'Ans', 'ans@example.org', false, now(), now()),
      ('fleur', 'Fleur', 'fleur@example.org', false, now(), now()),
      ('noor', 'Noor', 'noor@example.org', false, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, quiz_passed_at)
    values
      ('ans', 'Ans', '1951-04-02', 'NL', 'Utrecht', now(), '1', 'ANS234', null),
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', now(), '1', 'FLE234', now()),
      ('noor', 'Noor', '2002-02-02', 'NL', 'Utrecht', now(), '1', 'NOO234', null);
    insert into organization (id, name, country, city, status) values ('opvang', 'Opvang', 'NL', 'Utrecht', 'verified');
    insert into dog (id, owner_id, org_id, name, country, city) values
      ('bello', 'ans', null, 'Bello', 'NL', 'Utrecht'),
      ('saar', 'ans', null, 'Saar', 'NL', 'Utrecht'),
      ('max', 'ans', null, 'Max', 'NL', 'Utrecht'),
      ('kees', 'ans', null, 'Kees', 'NL', 'Utrecht'),
      ('luna', null, 'opvang', 'Luna', 'NL', 'Utrecht');
  `)
}, 30_000)

beforeEach(() => {
  current = 'fleur'
  notify.mockClear()
})

afterAll(async () => {
  await client.close()
})

describe('asking for a first meeting', () => {
  it('stores how it happens, and tells the owner', async () => {
    expect(await createRequest({ ok: false }, form({ dogId: 'bello', meetVia: 'phone' }))).toEqual({ ok: true, message: 'sent' })
    expect(await requestsOf('bello')).toMatchObject([{ kind: 'meet', meet_via: 'phone', status: 'pending' }])
    expect(notify).toHaveBeenCalledWith(db, ['ans'], 'request-new', expect.objectContaining({ dogName: 'Bello', meetVia: 'phone' }))
  })

  it('is a walk together when an older app leaves the way out', async () => {
    expect((await createRequest({ ok: false }, form({ dogId: 'saar' }))).ok).toBe(true)
    expect(await requestsOf('saar')).toMatchObject([{ meet_via: 'walk' }])
  })

  it('refuses ways that do not exist', async () => {
    expect(await createRequest({ ok: false }, form({ dogId: 'saar', meetVia: 'skype' }))).toEqual({ ok: false, error: 'invalid' })
  })

  it('meets a shelter dog only on location, walking', async () => {
    for (const via of ['home', 'phone', 'video']) {
      expect(await createRequest({ ok: false }, form({ dogId: 'luna', meetVia: via }))).toEqual({ ok: false, error: 'meet-via' })
    }
    expect((await createRequest({ ok: false }, form({ dogId: 'luna', meetVia: 'walk' }))).ok).toBe(true)
  })
})

describe('after a first call', () => {
  let call: string

  beforeAll(async () => {
    // The phone call with Bello was accepted, and took place an hour ago.
    call = (await requestsOf('bello'))[0].id
    await client.query(`update walk_request set status = 'accepted', starts_at = now() - interval '1 hour' where id = $1`, [call])
  })

  it('the owner cannot record the ID as seen or allow solo walks', async () => {
    current = 'ans'
    expect(await setTrust('bello', 'fleur', { idSeen: true, soloAllowed: false })).toEqual({ ok: false, error: 'needs-in-person' })
    expect(await setTrust('bello', 'fleur', { idSeen: false, soloAllowed: true })).toEqual({ ok: false, error: 'needs-in-person' })
    const grants = await client.query('select * from trust_grant where dog_id = $1', ['bello'])
    expect(grants.rows).toEqual([])
    const checks = await client.query('select * from id_check where walker_id = $1', ['fleur'])
    expect(checks.rows).toEqual([])
  })

  it('no walk with live location starts from it', async () => {
    expect(await beginWalk(call, await viewer('fleur'))).toEqual({ ok: false, error: 'needs-in-person' })
    const walks = await client.query('select * from walk where request_id = $1', [call])
    expect(walks.rows).toEqual([])
  })

  it('the meeting place and vet details stay private: they are for meeting in person', async () => {
    expect((await relationFor(await viewer('fleur'), await dog('bello'))).hasAccepted).toBe(false)
  })

  it('a solo walk is still out of reach, and can never be a call', async () => {
    expect(await createRequest({ ok: false }, form({ dogId: 'bello', kind: 'solo' }))).toEqual({ ok: false, error: 'needs-solo-trust' })
  })

  it('planning to meet in person closes the call', async () => {
    expect((await createRequest({ ok: false }, form({ dogId: 'bello', meetVia: 'home' }))).ok).toBe(true)
    expect(await requestsOf('bello')).toMatchObject([
      { id: call, meet_via: 'phone', status: 'completed' },
      { kind: 'meet', meet_via: 'home', status: 'pending' },
    ])
  })

  it('a visit that is still to come does not count yet: the ID was not seen', async () => {
    await client.exec(`update walk_request set status = 'accepted' where dog_id = 'bello' and meet_via = 'home'`)
    expect((await relationFor(await viewer('fleur'), await dog('bello'))).hasAccepted).toBe(true)
    current = 'ans'
    expect(await setTrust('bello', 'fleur', { idSeen: true, soloAllowed: false })).toEqual({ ok: false, error: 'meeting-ahead' })
  })

  it('once the visit took place, the owner can record trust', async () => {
    await client.exec(`update walk_request set starts_at = now() - interval '2 hours' where dog_id = 'bello' and meet_via = 'home'`)
    current = 'ans'
    // Solo walks need the ID seen in person first (besluit 4 okt 2026), said to the owner.
    expect(await setTrust('bello', 'fleur', { idSeen: false, soloAllowed: true })).toEqual({ ok: false, error: 'id-not-seen' })
    expect(await setTrust('bello', 'fleur', { idSeen: true, soloAllowed: true })).toEqual({ ok: true, trust: { idSeen: true, soloAllowed: true } })
    expect(notify).toHaveBeenCalledWith(db, ['fleur'], 'trust-granted', expect.objectContaining({ dogName: 'Bello' }))
    // Saving the same again is no news for the walker.
    notify.mockClear()
    expect((await setTrust('bello', 'fleur', { idSeen: true, soloAllowed: true })).ok).toBe(true)
    expect(notify).not.toHaveBeenCalled()
  })

  it('a regular walk is always a walk, never a call or a visit', async () => {
    for (const via of ['home', 'phone', 'video']) {
      expect(await createRequest({ ok: false }, form({ dogId: 'bello', kind: 'solo', meetVia: via }))).toEqual({ ok: false, error: 'meet-via' })
    }
    expect((await createRequest({ ok: false }, form({ dogId: 'bello', kind: 'solo' }))).ok).toBe(true)
  })
})

describe('one open request per walker and dog', () => {
  it('the same request sent again is the one already there: no second request, no second message', async () => {
    const before = await requestsOf('saar')
    notify.mockClear()
    expect(await createRequest({ ok: false }, form({ dogId: 'saar' }))).toEqual({ ok: true, message: 'sent' })
    expect(await requestsOf('saar')).toEqual(before)
    expect(notify).not.toHaveBeenCalled()
  })

  it('another moment for the same dog waits until the open one is answered or past', async () => {
    expect(await createRequest({ ok: false }, form({ dogId: 'saar', time: '11:00' }))).toEqual({ ok: false, error: 'already-open' })
    await client.exec(`update walk_request set status = 'declined' where dog_id = 'saar'`)
    expect((await createRequest({ ok: false }, form({ dogId: 'saar', time: '11:00' }))).ok).toBe(true)
  })

  it('a signed-out person hears that, instead of "something went wrong"', async () => {
    current = 'nobody'
    expect(await createRequest({ ok: false }, form({ dogId: 'saar' }))).toEqual({ ok: false, error: 'not-signed-in' })
    expect(await setTrust('saar', 'fleur', { idSeen: true, soloAllowed: false })).toEqual({ ok: false, error: 'not-signed-in' })
  })
})

describe('the safety quiz comes first (besluit 4 okt)', () => {
  it('a walker without it cannot ask to meet', async () => {
    current = 'noor'
    expect(await createRequest({ ok: false }, form({ dogId: 'max' }))).toEqual({ ok: false, error: 'needs-quiz' })
    expect(await requestsOf('max')).toEqual([])
  })
})

describe('two requests at the same moment', () => {
  it('only one gets in', async () => {
    const results = await Promise.all([
      createRequest({ ok: false }, form({ dogId: 'max', time: '10:00' })),
      createRequest({ ok: false }, form({ dogId: 'max', time: '12:00' })),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, error: 'already-open' }])
    expect(await requestsOf('max')).toHaveLength(1)
  })
})

describe('solo walks need the trust, every time', () => {
  // Kees: Fleur met Ans and Kees on a walk together, two hours ago.
  const minutes = (n: number) => new Date(Date.now() + n * 60_000)
  async function soloRequest(id: string) {
    await db.insert(schema.walkRequest).values({
      id,
      dogId: 'kees',
      walkerId: 'fleur',
      kind: 'solo',
      meetVia: 'walk',
      startsAt: minutes(5),
      durationMin: 30,
      weekly: id.startsWith('weekly'),
      status: 'accepted',
    })
  }

  beforeAll(async () => {
    await db.insert(schema.walkRequest).values([
      { id: 'kees-meet', dogId: 'kees', walkerId: 'fleur', kind: 'meet', meetVia: 'walk', startsAt: minutes(-120), durationMin: 30, status: 'accepted' },
      { id: 'kees-ask', dogId: 'kees', walkerId: 'fleur', kind: 'solo', meetVia: 'walk', startsAt: minutes(24 * 60), durationMin: 30 },
    ])
  })

  it('the owner cannot accept one without saying yes to solo walks first', async () => {
    current = 'ans'
    expect(await respondToRequest('kees-ask', 'accept')).toEqual({ ok: false, error: 'solo-not-allowed' })
    // A row from before the ID rule: solo without the ID seen never counts.
    await client.exec(`insert into trust_grant (dog_id, walker_id, granted_by, id_seen, solo_allowed) values ('kees', 'fleur', 'ans', false, true)`)
    expect(await respondToRequest('kees-ask', 'accept')).toEqual({ ok: false, error: 'id-not-seen' })
    expect((await relationFor(await viewer('fleur'), await dog('kees'))).soloAllowed).toBe(false)
  })

  it('a walk without the ID seen does not start', async () => {
    await soloRequest('kees-now')
    expect(await beginWalk('kees-now', await viewer('fleur'))).toEqual({ ok: false, error: 'needs-id' })
  })

  it('once the ID is seen, saying yes again is news, and the walk can start', async () => {
    current = 'ans'
    notify.mockClear()
    expect((await setTrust('kees', 'fleur', { idSeen: true, soloAllowed: true })).ok).toBe(true)
    expect(notify).toHaveBeenCalledWith(db, ['fleur'], 'trust-granted', expect.objectContaining({ dogName: 'Kees' }))
    expect((await respondToRequest('kees-ask', 'accept')).ok).toBe(true)
    const started = await beginWalk('kees-now', await viewer('fleur'))
    expect(started.ok).toBe(true)
    expect((await finishWalk(started.walkId!, await viewer('fleur'))).ok).toBe(true)
  })

  it('a weekly walk rolls on only while the trust holds', async () => {
    await soloRequest('weekly-1')
    const first = await beginWalk('weekly-1', await viewer('fleur'))
    expect(first.ok).toBe(true)
    // The ID tick was taken off in the meantime (an older row, or straight in the database).
    await client.exec(`update trust_grant set id_seen = false where dog_id = 'kees'`)
    expect((await finishWalk(first.walkId!, await viewer('fleur'))).ok).toBe(true)
    const [row] = (await client.query<{ status: string }>(`select status from walk_request where id = 'weekly-1'`)).rows
    expect(row.status).toBe('completed')
    await client.exec(`update trust_grant set id_seen = true where dog_id = 'kees'`)
  })

  it('taking solo walks back stops every solo walk still planned, and the walker hears it', async () => {
    await soloRequest('weekly-2')
    current = 'ans'
    notify.mockClear()
    expect((await setTrust('kees', 'fleur', { idSeen: true, soloAllowed: false })).ok).toBe(true)
    const rows = (await client.query<{ id: string; status: string }>(`select id, status from walk_request where id in ('weekly-2', 'kees-ask')`)).rows
    expect(rows.map((r) => r.status)).toEqual(['cancelled', 'cancelled'])
    expect(notify).toHaveBeenCalledWith(db, ['fleur'], 'request-cancelled', expect.objectContaining({ dogName: 'Kees' }))
    expect(await beginWalk('weekly-2', await viewer('fleur'))).toEqual({ ok: false, error: 'not-now' })
  })

  it('an agreed weekly solo walk leaves room for an extra one', async () => {
    current = 'ans'
    expect((await setTrust('kees', 'fleur', { idSeen: true, soloAllowed: true })).ok).toBe(true)
    await soloRequest('weekly-3')
    current = 'fleur'
    expect((await createRequest({ ok: false }, form({ dogId: 'kees', kind: 'solo', time: '15:00' }))).ok).toBe(true)
  })
})
