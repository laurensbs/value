import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

// POST /api/v1/my-dogs with the real checks of the website's form (server/dog-core.ts saveDogForm) on a
// real database: a dog for someone else only with the owner's yes (DPIA maatregel M5).

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))
vi.mock('@/server/session', () => ({ isOrgMember: () => false }))
vi.mock('@/server/newest-dogs', () => ({ dogsChanged: vi.fn() }))
vi.mock('@/server/queries', () => ({ myDogs: vi.fn(async () => []) }))
vi.mock('next/server', async (original) => ({ ...(await original<typeof import('next/server')>()), after: (task: () => Promise<unknown>) => void task() }))
vi.mock('@/server/api', async () => {
  const { NextResponse } = await import('next/server')
  return {
    apiMember: vi.fn(async () => ({ userId: 'ans', isAdmin: false, orgs: [], profile: { lat: null, lng: null } })),
    dogLook: vi.fn(),
    fail: (error: string) => NextResponse.json({ error, message: 'generic' }, { status: 400 }),
    json: (body: unknown, status = 200) => NextResponse.json(body, { status }),
  }
})
vi.mock('next-intl/server', async () => {
  const { createTranslator } = await import('next-intl')
  const nl = (await import('../../../../../messages/nl.json')).default
  return { getTranslations: async (namespace?: string) => createTranslator({ locale: 'nl', messages: nl as never, namespace: namespace as never }) }
})

const { POST } = await import('./route')

const DOG = { name: 'Bobbie', sex: 'male', size: 'medium', energy: 'calm', level: 'starter', treats: 'own', walkMinutes: 30, country: 'NL', city: 'Utrecht', insuranceConfirmed: true, healthConfirmed: true }
const post = (extra: Record<string, unknown>) =>
  POST(new Request('http://localhost/api/v1/my-dogs', { method: 'POST', body: JSON.stringify({ ...DOG, ...extra }), headers: { 'content-type': 'application/json' } }))
const bobbies = async () => (await client.query<{ n: number }>(`select count(*)::int as n from dog where name = 'Bobbie'`)).rows[0].n

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values ('ans', 'Ans', 'ans@example.org', false, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code)
      values ('ans', 'Ans', '1951-01-01', 'NL', 'Utrecht', now(), '0.4', 'ANS234');
  `)
})

describe('POST /api/v1/my-dogs: a dog for someone else (DPIA maatregel M5)', () => {
  it('is refused without the owner\'s yes, calmly, and nothing goes online', async () => {
    const res = await post({ forSomeone: true })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'owner-consent', message: 'Vink aan dat de eigenaar ervan weet en het goed vindt.' })
    expect(await post({ forSomeone: true, ownerConsent: false })).toHaveProperty('status', 400)
    expect(await bobbies()).toBe(0)
  })

  it('goes online with the yes, and an older app that sends neither still adds its own dog', async () => {
    expect((await post({ forSomeone: true, ownerConsent: true })).status).toBe(201)
    expect((await post({})).status).toBe(201)
    expect(await bobbies()).toBe(2)
  })
})
