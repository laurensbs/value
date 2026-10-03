import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))

const { getDogDetail, incomingRequests, outgoingRequests } = await import('./queries')

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
