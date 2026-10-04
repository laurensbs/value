import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })
const revalidateTag = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))
vi.mock('next/cache', () => ({ revalidateTag, unstable_cache: (fn: () => unknown) => fn }))

const { dogsChanged, NEWEST_DOGS_TAG, queryNewestDogs } = await import('./newest-dogs')

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`insert into "user" (id, name, email, email_verified, created_at, updated_at) values ('ans', 'Ans', 'ans-test', false, now(), now())`)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('newest real dogs from the database', () => {
  it('is empty with only example content', async () => {
    await client.exec(`
      insert into organization (id, name, country, city, status, is_demo) values ('demo-zuidpark', 'Dierenopvang Zuidpark', 'NL', 'Utrecht', 'verified', true);
      insert into dog (id, org_id, name, country, city, is_demo) values ('demo-noor', 'demo-zuidpark', 'Noor', 'NL', 'Utrecht', true);
      insert into dog (id, owner_id, name, country, city, is_demo) values ('demo-saar', 'ans', 'Saar', 'NL', 'Tiel', true);
    `)
    expect(await queryNewestDogs()).toEqual([])
  })

  it('shows real, active dogs only, Dutch dogs first and newest first, with the town and no coordinates', async () => {
    await client.exec(`
      insert into dog (id, owner_id, name, country, city, lat, lng, meeting_info, created_at) values ('lola', 'ans', 'Lola', 'ES', 'Madrid', 40.4, -3.7, '', now());
      insert into dog (id, owner_id, name, country, city, lat, lng, meeting_info, created_at) values ('bello', 'ans', 'Bello', 'NL', 'Tiel', 51.88, 5.43, 'Bij de kerk', now() - interval '2 days');
      insert into dog (id, owner_id, name, country, city, created_at) values ('guus', 'ans', 'Guus', 'NL', 'Gorinchem', now() - interval '1 day');
      insert into dog (id, owner_id, name, country, city, status) values ('pip', 'ans', 'Pip', 'NL', 'Leerdam', 'paused');
      insert into dog (id, owner_id, name, country, city, status) values ('rex', 'ans', 'Rex', 'NL', 'Leerdam', 'hidden');
      insert into organization (id, name, country, city, status) values ('nieuw', 'Nieuwe Opvang', 'NL', 'Culemborg', 'pending');
      insert into dog (id, org_id, name, country, city) values ('max', 'nieuw', 'Max', 'NL', 'Culemborg');
    `)
    const list = await queryNewestDogs()
    expect(list.map((d) => d.id)).toEqual(['guus', 'bello', 'lola'])
    expect(list[1]).toEqual({ id: 'bello', name: 'Bello', breed: '', city: 'Tiel', country: 'NL', photo: null, avatar: null, energy: 'medium', walkMinutes: 30, host: 'owner' })
    expect(JSON.stringify(list)).not.toMatch(/kerk|51\.88|lat|lng/)
  })

  it('a verified shelter brings its dogs', async () => {
    await client.exec(`
      insert into organization (id, name, country, city, status) values ('asiel', 'Asiel Tiel', 'NL', 'Tiel', 'verified');
      insert into dog (id, org_id, name, country, city, photos) values ('luna', 'asiel', 'Luna', 'NL', 'Tiel', array['https://x.public.blob.vercel-storage.com/luna.jpg']);
    `)
    const [luna] = await queryNewestDogs()
    expect(luna).toMatchObject({ id: 'luna', host: 'shelter', photo: 'https://x.public.blob.vercel-storage.com/luna.jpg' })
  })

  it('clears the cached list at once when dogs change', () => {
    dogsChanged()
    expect(revalidateTag).toHaveBeenCalledWith(NEWEST_DOGS_TAG, { expire: 0 })
  })
})
