import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))

const { cityIsIndexable, indexableCities, publicCities } = await import('./cities')

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  // An owner without a real address: this table only needs something unique.
  await client.exec(`insert into "user" (id, name, email, email_verified, created_at, updated_at) values ('ans', 'Ans', 'ans-test', false, now(), now())`)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('city pages in search engines', () => {
  it('a city with only a directory shelter stays out', async () => {
    expect(await cityIsIndexable('amsterdam')).toBe(false)
    expect((await indexableCities()).size).toBe(0)
  })

  it('example shelters, dogs and walks never count, even verified and upcoming', async () => {
    await client.exec(`
      insert into organization (id, name, country, city, status, is_demo) values ('demo-olivos', 'Protectora Los Olivos', 'ES', 'Madrid', 'verified', true);
      insert into dog (id, org_id, name, country, city, is_demo) values ('demo-noor', 'demo-olivos', 'Noor', 'ES', 'Madrid', true);
      insert into dog (id, owner_id, name, country, city, is_demo) values ('demo-saar', 'ans', 'Saar', 'ES', 'Madrid', true);
      insert into group_walk (id, org_id, starts_at) values ('demo-gw', 'demo-olivos', now() + interval '2 days');
      insert into organization (id, name, country, city, status, is_demo) values ('demo-zuidpark', 'Dierenopvang Zuidpark', 'NL', 'Utrecht', 'verified', true);
    `)
    expect(await cityIsIndexable('madrid')).toBe(false)
    // An example shelter in a town outside the directory does not even add a page.
    expect((await publicCities()).some((c) => c.slug === 'utrecht')).toBe(false)
    expect(await cityIsIndexable('utrecht')).toBe(false)
  })

  it('a real active dog of a private owner makes its city indexable', async () => {
    await client.exec(`insert into dog (id, owner_id, name, country, city) values ('bello', 'ans', 'Bello', 'NL', 'Amsterdam')`)
    expect(await cityIsIndexable('amsterdam')).toBe(true)
  })

  it('a paused dog, a dog of an unverified shelter or a town name from another country do not', async () => {
    await client.exec(`
      insert into dog (id, owner_id, name, country, city, status) values ('pip', 'ans', 'Pip', 'NL', 'Breda', 'paused');
      insert into organization (id, name, country, city, status) values ('nieuw', 'Nieuwe Opvang', 'NL', 'Leiden', 'pending');
      insert into dog (id, org_id, name, country, city) values ('max', 'nieuw', 'Max', 'NL', 'Leiden');
      insert into dog (id, owner_id, name, country, city) values ('toby', 'ans', 'Toby', 'NL', 'Sevilla');
    `)
    expect(await cityIsIndexable('breda')).toBe(false)
    expect(await cityIsIndexable('leiden')).toBe(false)
    expect(await cityIsIndexable('sevilla')).toBe(false)
  })

  it('a verified partner shelter counts, also in a town outside the directory', async () => {
    await client.exec(`
      insert into organization (id, name, country, city, status) values ('gent', 'Opvang Gent', 'BE', 'Gent', 'verified');
      insert into organization (id, name, country, city, lat, lng, status) values ('hoorn', 'Opvang Hoorn', 'NL', 'Hoorn', 52.64, 5.06, 'verified');
    `)
    expect(await cityIsIndexable('gent')).toBe(true)
    expect(await cityIsIndexable('hoorn')).toBe(true)
    expect((await publicCities()).find((c) => c.slug === 'hoorn')).toMatchObject({ lat: 52.64, lng: 5.06 })
  })

  it('remembers when something last changed, for the sitemap', async () => {
    const before = (await indexableCities()).get('gent')!
    await client.exec(`insert into group_walk (id, org_id, starts_at, created_at) values ('gw-gent', 'gent', now() + interval '3 days', now() + interval '1 minute')`)
    const after = (await indexableCities()).get('gent')!
    expect(after.getTime()).toBeGreaterThan(before.getTime())
    expect([...(await indexableCities()).keys()].sort()).toEqual(['amsterdam', 'gent', 'hoorn'])
  })
})
