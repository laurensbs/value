import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'
import { DIRECT, INVITE } from './sources-core'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))

const { sourcesData } = await import('./sources')

// Monday 5 October 2026, 12:00 in Amsterdam: ISO week 41 has just begun.
const NOW = new Date('2026-10-05T10:00:00Z')

beforeAll(async () => {
  process.env.ADMIN_EMAILS = 'beheer@rondje.test'
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  // Example data the way the seed marks it (ids "demo-…", is_demo, @demo.example.org), an admin,
  // and real people who came in through different links.
  await client.exec(`
    insert into "user" (id, name, email, email_verified, role, created_at, updated_at) values
      ('demo-ans', 'Ans', 'demo-ans@demo.example.org', true, 'user', now(), now()),
      ('admin', 'Beheer', 'beheer@rondje.test', true, 'user', now(), now()),
      ('root', 'Root', 'root@rondje.test', true, 'admin', now(), now()),
      ('fleur', 'Fleur', 'fleur@rondje.test', true, 'user', now(), now()),
      ('ruud', 'Ruud', 'ruud@rondje.test', true, 'user', now(), now()),
      ('sam', 'Sam', 'sam@rondje.test', true, 'user', now(), now()),
      ('noor', 'Noor', 'noor@rondje.test', true, 'user', now(), now()),
      ('bas', 'Bas', 'bas@rondje.test', true, 'user', now(), now()),
      ('jet', 'Jet', 'jet@rondje.test', true, 'user', now(), now()),
      ('old', 'Oud', 'oud@rondje.test', true, 'user', now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, referred_by, wants_to_walk, has_dogs, created_at) values
      ('demo-ans', 'Ans', '1945-03-12', 'NL', 'Utrecht', now(), 'demo', 'DEMO0', 'INSTAGRAM', false, true, '2026-10-05 08:00'),
      ('admin', 'Beheer', '1990-01-01', 'NL', 'Utrecht', now(), '0.3', 'ADM234', 'INSTAGRAM', false, false, '2026-10-01 09:00'),
      ('root', 'Root', '1990-01-01', 'NL', 'Utrecht', now(), '0.3', 'RTT234', null, true, false, '2026-10-01 09:00'),
      -- Fleur came through Instagram and invited Sam with her own link.
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', now(), '0.3', 'FLE234', 'INSTAGRAM', true, false, '2026-10-05 07:00'),
      ('sam', 'Sam', '2001-01-01', 'NL', 'Utrecht', now(), '0.3', 'SAM234', 'fle234', true, true, '2026-10-05 08:30'),
      -- Ruud typed the address himself and has a dog.
      ('ruud', 'Ruud', '1948-02-02', 'NL', 'Utrecht', now(), '0.3', 'RUU234', null, false, true, '2026-09-30 10:00'),
      -- Noor works at a shelter and came through the crowdfunding (/aanmelden?bron=whydonate).
      ('noor', 'Noor', '1985-05-05', 'NL', 'Utrecht', now(), '0.3', 'NOO234', 'WHYDONATE', false, false, '2026-09-29 10:00'),
      -- Bas chose "Ik werk bij een opvang" and has not filled in the shelter form yet.
      ('bas', 'Bas', '1980-08-08', 'NL', 'Utrecht', now(), '0.3', 'BAS234', 'HELPONS', false, false, '2026-10-05 09:00'),
      -- Jet: a story on Instagram, three weeks ago.
      ('jet', 'Jet', '2000-02-02', 'NL', 'Utrecht', now(), '0.3', 'JET234', 'IGSTORIES', true, false, '2026-09-15 10:00'),
      -- Before the eight weeks: not shown.
      ('old', 'Oud', '1970-07-07', 'NL', 'Utrecht', now(), '0.3', 'OLD234', 'INSTAGRAM', true, false, '2026-08-01 10:00');
    insert into organization (id, name, country, city, status, is_demo, created_at) values
      ('demo-zuidpark', 'Dierenopvang Zuidpark', 'NL', 'Utrecht', 'verified', true, '2026-10-01 08:00'),
      ('opvang-noord', 'Opvang Noord', 'NL', 'Utrecht', 'pending', false, '2026-09-29 11:00');
    insert into organization_member (org_id, user_id, role) values
      ('opvang-noord', 'noor', 'owner'),
      -- Fleur helps out at the example shelter: that does not make her shelter staff.
      ('demo-zuidpark', 'fleur', 'staff');
    insert into dog (id, owner_id, org_id, name, country, city, status, is_demo, created_at) values
      ('bello', 'ruud', null, 'Bello', 'NL', 'Utrecht', 'active', false, '2026-09-30 11:00'),
      ('max', 'sam', null, 'Max', 'NL', 'Utrecht', 'active', false, '2026-10-05 09:00'),
      ('luna', null, 'opvang-noord', 'Luna', 'NL', 'Utrecht', 'active', false, '2026-10-05 09:30'),
      -- Never counted: a draft, example dogs, the admin's own dog, and a dog from before the eight weeks.
      ('concept', 'sam', null, 'Concept', 'NL', 'Utrecht', 'draft', false, '2026-10-05 09:00'),
      ('demo-saar', 'demo-ans', null, 'Saar', 'NL', 'Utrecht', 'active', true, '2026-10-05 08:00'),
      ('mo', null, 'demo-zuidpark', 'Mo', 'NL', 'Utrecht', 'active', false, '2026-10-05 08:00'),
      ('test', 'admin', null, 'Test', 'NL', 'Utrecht', 'active', false, '2026-10-05 08:00'),
      ('oud', 'ruud', null, 'Oud', 'NL', 'Utrecht', 'active', false, '2026-08-01 08:00');
  `)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('sources (Bronnen in Beheer)', () => {
  it('counts real sign-ups per ISO week, source and role', async () => {
    const data = await sourcesData(NOW)
    expect(data.weeks.map((w) => w.isoWeek)).toEqual([34, 35, 36, 37, 38, 39, 40, 41])
    const [, , , , week38, , week40, week41] = data.weeks
    expect(week41.signups).toEqual({ walker: 2, owner: 1, shelter: 1, total: 3 })
    expect(week41.sources).toEqual([
      { key: INVITE, counts: { walker: 1, owner: 1, shelter: 0, total: 1 } },
      { key: 'HELPONS', counts: { walker: 0, owner: 0, shelter: 1, total: 1 } },
      { key: 'INSTAGRAM', counts: { walker: 1, owner: 0, shelter: 0, total: 1 } },
    ])
    expect(week40.sources).toEqual([
      { key: DIRECT, counts: { walker: 0, owner: 1, shelter: 0, total: 1 } },
      { key: 'WHYDONATE', counts: { walker: 0, owner: 0, shelter: 1, total: 1 } },
    ])
    expect(week38.sources).toEqual([{ key: 'IGSTORIES', counts: { walker: 1, owner: 0, shelter: 0, total: 1 } }])
    expect(data.totals).toEqual({ walker: 3, owner: 2, shelter: 2, total: 6 })
  })

  it('counts new real dogs only: no drafts, example dogs or the admin’s own', async () => {
    const data = await sourcesData(NOW)
    expect(data.weeks.map((w) => w.dogs)).toEqual([0, 0, 0, 0, 0, 0, 1, 2])
    expect(data.dogs).toBe(3)
  })

  it('only lets counts and campaign codes out: no names, e-mail addresses or personal codes', async () => {
    const json = JSON.stringify(await sourcesData(NOW))
    for (const secret of ['Fleur', 'fleur', 'Sam', 'Ruud', 'Noor', '@', 'FLE234', 'SAM234', 'ADM234', 'Opvang Noord', 'Bello']) {
      expect(json, secret).not.toContain(secret)
    }
  })

  it('is calm and empty in weeks without sign-ups, across the turn of the year', async () => {
    // Tuesday 5 January 2027: everyone above signed up before these eight weeks.
    const data = await sourcesData(new Date('2027-01-05T10:00:00Z'))
    expect(data.weeks.map((w) => [w.isoYear, w.isoWeek])).toEqual([
      [2026, 47],
      [2026, 48],
      [2026, 49],
      [2026, 50],
      [2026, 51],
      [2026, 52],
      [2026, 53],
      [2027, 1],
    ])
    expect(data.totals.total).toBe(0)
    expect(data.bySource).toEqual([])
    expect(data.dogs).toBe(0)
  })
})
