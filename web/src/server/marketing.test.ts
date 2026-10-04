import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))

const { marketingData } = await import('./marketing')

const NOW = new Date('2026-10-03T14:00:00Z')

beforeAll(async () => {
  process.env.ADMIN_EMAILS = 'beheer@rondje.test'
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  // Example data the way the seed marks it, an admin, and a little real data.
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('demo-ans', 'Ans', 'demo-ans@demo.example.org', true, now(), now()),
      ('admin', 'Beheer', 'beheer@rondje.test', true, now(), now()),
      ('fleur', 'Fleur', 'fleur@rondje.test', true, now(), now()),
      ('daan', 'Daan', 'daan@rondje.test', true, now(), now()),
      ('ruud', 'Ruud', 'ruud@rondje.test', true, now(), now()),
      ('half', 'Half', 'half@rondje.test', true, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, lat, lng, wants_to_walk, has_dogs, terms_accepted_at, terms_version, referral_code, referred_by, created_at) values
      ('demo-ans', 'Ans', '1945-03-12', 'NL', 'Utrecht', 52.09, 5.12, false, true, now(), 'demo', 'DEMO0', null, '2026-10-01 08:00'),
      ('admin', 'Beheer', '1990-01-01', 'NL', 'Utrecht', 52.09, 5.12, false, false, now(), '1', 'ADM234', null, '2026-10-01 09:00'),
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', 52.09, 5.12, true, false, now(), '1', 'FLE234', 'ADM234', '2026-10-02 10:00'),
      ('daan', 'Daan', '2002-01-01', 'NL', 'Amsterdam', 52.37, 4.89, true, false, now(), '1', 'DAA234', 'IGSTARTOKT', '2026-10-02 11:00'),
      ('ruud', 'Ruud', '1948-02-02', 'NL', 'Utrecht', 52.09, 5.12, false, true, now(), '1', 'RUU234', 'FLE234', '2026-09-25 10:00');
    insert into organization (id, name, country, city, status, is_demo, created_at) values
      ('demo-zuidpark', 'Dierenopvang Zuidpark', 'NL', 'Utrecht', 'verified', true, '2026-10-01 08:00');
    insert into dog (id, owner_id, org_id, name, country, city, lat, lng, status, is_demo, created_at) values
      ('demo-saar', 'demo-ans', null, 'Saar', 'NL', 'Amsterdam', 52.37, 4.89, 'active', true, '2026-10-01 08:00'),
      ('demo-mo', null, 'demo-zuidpark', 'Mo', 'NL', 'Amsterdam', 52.37, 4.89, 'active', true, '2026-10-01 08:00'),
      ('bello', 'ruud', null, 'Bello', 'NL', 'Utrecht', 52.09, 5.12, 'active', false, '2026-10-02 11:00'),
      ('test', 'admin', null, 'Test', 'NL', 'Amsterdam', 52.37, 4.89, 'active', false, '2026-10-02 11:00');
    insert into suggestion (id, kind, name, country, city, directory_id, suggested_by, created_at) values
      ('v1', 'vote', 'Dierenopvangcentrum Amsterdam (DOA)', 'NL', 'Amsterdam', 'nl-doa-amsterdam', 'daan', '2026-10-02 12:00'),
      ('v2', 'vote', 'Dierenopvangcentrum Amsterdam (DOA)', 'NL', 'Amsterdam', 'nl-doa-amsterdam', 'admin', '2026-10-02 12:00'),
      ('v3', 'vote', 'Dierenopvangcentrum Amsterdam (DOA)', 'NL', 'Amsterdam', 'nl-doa-amsterdam', 'demo-ans', '2026-10-02 12:00');
    insert into launch_task (key, status, done_at) values
      ('post:p01', 'done', now()),
      ('post:p02', 'open', null),
      ('analytics', 'done', now());
  `)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('marketing hub data', () => {
  it('answers from real members only (no example data, no admins)', async () => {
    const data = await marketingData(NOW)
    const by = Object.fromEntries(data.answers.map((a) => [a.id, a]))
    // Accounts: fleur, daan, ruud and "half" (no profile yet).
    expect(by.funnel.steps?.slice(0, 2)).toEqual([
      { key: 'account', n: 4 },
      { key: 'profile', n: 3 },
    ])
    expect(by.newMembers.values).toMatchObject({ thisWeek: 2, lastWeek: 1, total: 3 })
    // Daan wants to walk in Amsterdam and voted there; the admin's and the example dogs and votes do not count.
    expect(by.demand.values).toMatchObject({ city: 'Amsterdam', demand: 1, supply: 0 })
    expect(by.wantedShelter.values).toMatchObject({ name: 'Dierenopvangcentrum Amsterdam (DOA)', n: 1 })
    expect(by.ownersDog.values).toMatchObject({ withDog: 1, owners: 1 })
    expect(by.walkersWaiting.values).toMatchObject({ waiting: 1, walkers: 2, city: 'Amsterdam' })
    expect(by.referrals.values).toMatchObject({ referred: 3, own: 1, viaMembers: 1, viaCodes: 1 })
    expect(by.referrals.rows).toEqual([{ label: 'IGSTARTOKT', value: 1 }])
    expect(by.traffic.status).toBe('watch')
    expect(data.totals).toEqual({ members: 3, dogs: 1, walks: 0 })
  })

  it('knows which posts were posted', async () => {
    const data = await marketingData(NOW)
    expect(data.posted).toEqual(['p01'])
  })

  it('never lets a name or e-mail address out', async () => {
    const text = JSON.stringify(await marketingData(NOW))
    for (const secret of ['Fleur', 'Daan', 'Ruud', 'fleur@rondje.test', 'beheer@rondje.test', 'FLE234', 'ADM234', 'Bello']) expect(text).not.toContain(secret)
  })
})
