import { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))
vi.mock('@/lib/auth', () => ({ enabledSocialProviders: [] }))

const { launchData } = await import('./launch')

const NOW = new Date('2026-10-03T14:00:00Z')

beforeAll(async () => {
  process.env.ADMIN_EMAILS = 'beheer@rondje.test'
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  // Example data the way the seed marks it (ids "demo-…", is_demo), plus a little real data.
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('demo-ans', 'Ans', 'demo-ans@demo.example.org', true, now(), now()),
      ('admin', 'Beheer', 'beheer@rondje.test', true, now(), now()),
      ('fleur', 'Fleur', 'fleur@rondje.test', true, now(), now()),
      ('ruud', 'Ruud', 'ruud@rondje.test', true, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, created_at) values
      ('demo-ans', 'Ans', '1945-03-12', 'NL', 'Utrecht', now(), 'demo', 'DEMO0', '2026-10-01 08:00'),
      ('admin', 'Beheer', '1990-01-01', 'NL', 'Utrecht', now(), '1', 'ADM234', '2026-10-01 09:00'),
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', now(), '1', 'FLE234', '2026-10-02 10:00'),
      ('ruud', 'Ruud', '1948-02-02', 'NL', 'Utrecht', now(), '1', 'RUU234', '2026-09-25 10:00');
    insert into organization (id, name, country, city, status, is_demo, created_at) values
      ('demo-zuidpark', 'Dierenopvang Zuidpark', 'NL', 'Utrecht', 'verified', true, '2026-10-01 08:00');
    insert into dog (id, owner_id, org_id, name, country, city, is_demo, created_at) values
      ('demo-saar', 'demo-ans', null, 'Saar', 'NL', 'Utrecht', true, '2026-10-01 08:00'),
      ('demo-mo', null, 'demo-zuidpark', 'Mo', 'NL', 'Utrecht', true, '2026-10-01 08:00'),
      ('bello', 'ruud', null, 'Bello', 'NL', 'Utrecht', false, '2026-10-02 11:00');
    -- A request and a finished walk with an example dog: never a milestone.
    insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min, status, created_at) values
      ('r-demo', 'demo-saar', 'fleur', 'meet', '2026-10-02 10:00', 30, 'completed', '2026-10-01 12:00');
    insert into walk (id, dog_id, walker_id, started_at, planned_end_at, ended_at, status) values
      ('w-demo', 'demo-mo', 'fleur', '2026-10-02 10:00', '2026-10-02 10:30', '2026-10-02 10:35', 'ended');
    -- The first real request (kennismaking), still pending.
    insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min, status, created_at) values
      ('r1', 'bello', 'fleur', 'meet', '2026-10-04 10:00', 30, 'pending', '2026-10-03 09:00');
    insert into outreach_contact (id, audience, organisation, email, status) values
      ('c1', 'shelter', 'Opvang Test', 'info@opvang.test', 'meeting');
  `)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('launch hub data', () => {
  it('counts only real members, not example people or admins', async () => {
    const data = await launchData(NOW)
    expect(data.members).toBe(2)
    expect(data.weeks.series.members.slice(-2)).toEqual([1, 1])
  })

  it('reaches milestones from real rows only', async () => {
    const data = await launchData(NOW)
    const byId = Object.fromEntries(data.milestones.map((m) => [m.id, m]))
    expect(byId.firstShelter.reached).toBe(false)
    expect(byId.firstWalk.reached).toBe(false)
    expect(byId.firstIntro).toMatchObject({ reached: true, at: new Date('2026-10-03T09:00:00Z') })
    expect(data.weeks.series.walks.reduce((a, b) => a + b)).toBe(0)
    expect(data.weeks.series.dogs.reduce((a, b) => a + b)).toBe(1)
    expect(data.weeks.series.shelters.reduce((a, b) => a + b)).toBe(0)
  })

  it('stores a reached milestone, so it stays after the data is gone', async () => {
    const [row] = await db.select().from(schema.launchTask).where(eq(schema.launchTask.key, 'milestone:firstIntro'))
    expect(row).toMatchObject({ status: 'done', doneAt: new Date('2026-10-03T09:00:00Z') })
    await client.exec(`delete from walk_request where id = 'r1'`)
    const data = await launchData(NOW)
    expect(data.milestones.find((m) => m.id === 'firstIntro')?.reached).toBe(true)
  })

  it('ticks off tasks from real data, and points follow', async () => {
    const data = await launchData(NOW)
    const all = [...data.tasks.waiting, ...data.tasks.mine, ...data.tasks.others, ...data.tasks.done]
    const byKey = Object.fromEntries(all.map((t) => [t.key, t]))
    expect(byKey.firstDemo).toMatchObject({ done: true, autoDone: true })
    expect(byKey.firstDog).toMatchObject({ done: true, autoDone: true })
    expect(byKey.firstMails.done).toBe(false)
    expect(byKey.goLive.done).toBe(false)
    // firstDemo 20 + firstDog 25 + first meeting 30
    expect(data.points).toBe(75)
    expect(data.level.key).toBe('pup')
    expect(data.costs.total).toBe(0)
    expect(data.costs.perMember).toBe(0)
    expect(data.costs.walksPerActive).toBeNull()
  })
})
