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
  actionViewer: async () => viewer(current),
  isOrgMember: (v: { orgs: { id: string }[] }, orgId: string | null) => Boolean(orgId && v.orgs.some((o) => o.id === orgId)),
}))

const { createRequest, setTrust } = await import('./requests')
const { beginWalk } = await import('../walks')
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
      ('fleur', 'Fleur', 'fleur@example.org', false, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, quiz_passed_at)
    values
      ('ans', 'Ans', '1951-04-02', 'NL', 'Utrecht', now(), '1', 'ANS234', null),
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', now(), '1', 'FLE234', now());
    insert into organization (id, name, country, city, status) values ('opvang', 'Opvang', 'NL', 'Utrecht', 'verified');
    insert into dog (id, owner_id, org_id, name, country, city) values
      ('bello', 'ans', null, 'Bello', 'NL', 'Utrecht'),
      ('saar', 'ans', null, 'Saar', 'NL', 'Utrecht'),
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

  it('once the visit in person is accepted, the owner can record trust', async () => {
    await client.exec(`update walk_request set status = 'accepted' where dog_id = 'bello' and meet_via = 'home'`)
    expect((await relationFor(await viewer('fleur'), await dog('bello'))).hasAccepted).toBe(true)
    current = 'ans'
    expect(await setTrust('bello', 'fleur', { idSeen: true, soloAllowed: true })).toEqual({ ok: true })
  })

  it('a regular walk is always a walk, never a call or a visit', async () => {
    for (const via of ['home', 'phone', 'video']) {
      expect(await createRequest({ ok: false }, form({ dogId: 'bello', kind: 'solo', meetVia: via }))).toEqual({ ok: false, error: 'meet-via' })
    }
    expect((await createRequest({ ok: false }, form({ dogId: 'bello', kind: 'solo' }))).ok).toBe(true)
  })
})
