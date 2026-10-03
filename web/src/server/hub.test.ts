import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db, dbMode: () => 'pglite' }))
vi.mock('@/lib/auth', () => ({ enabledSocialProviders: ['google'] }))

const { hubStats, loadHubState } = await import('./hub')

const NOW = new Date('2026-10-04T12:00:00Z')

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('ans', 'Ans', 'ans@example.org', false, now(), now()),
      ('fleur', 'Fleur', 'fleur@example.org', false, now(), now()),
      ('tom', 'Tom', 'tom@example.org', false, now(), now()),
      ('sem', 'Sem', 'sem@example.org', false, now(), now()),
      ('demo', 'Demo', 'demo@demo.example.org', false, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code,
      wants_to_walk, has_dogs, bio, quiz_passed_at)
    values
      ('ans', 'Ans', '1951-04-02', 'NL', 'Utrecht', now(), '1', 'ANS234', false, true, '', null),
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', now(), '1', 'FLE234', true, false, '', '2026-09-20 10:00'),
      -- Tom walked, then switched walking off.
      ('tom', 'Tom', '1990-01-01', 'NL', 'Utrecht', now(), '1', 'TOM234', false, false, '', '2026-09-20 10:00'),
      -- Sem sent a request without doing the quiz.
      ('sem', 'Sem', '2000-02-02', 'NL', 'Utrecht', now(), '1', 'SEM234', true, false, '', null),
      ('demo', 'Demo', '2000-02-02', 'NL', 'Utrecht', now(), '1', 'DEM234', true, true, '', null);
    insert into dog (id, owner_id, name, country, city, created_at) values ('bello', 'ans', 'Bello', 'NL', 'Utrecht', '2026-09-20 09:00');
    insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min, status) values
      ('r1', 'bello', 'fleur', 'meeting', '2026-09-22 10:00', 30, 'completed'),
      ('r2', 'bello', 'tom', 'meeting', '2026-09-23 10:00', 30, 'completed'),
      ('r3', 'bello', 'sem', 'meeting', '2026-10-05 10:00', 30, 'pending');
    insert into walk (id, request_id, dog_id, walker_id, started_at, planned_end_at, ended_at, status) values
      ('w1', 'r1', 'bello', 'fleur', '2026-09-24 10:00', '2026-09-24 10:30', '2026-09-24 10:30', 'ended'),
      ('w2', null, 'bello', 'fleur', '2026-09-26 10:00', '2026-09-26 10:30', '2026-09-26 10:30', 'ended'),
      ('w3', null, 'bello', 'fleur', '2026-09-28 10:00', '2026-09-28 10:30', '2026-09-28 10:30', 'ended'),
      ('w4', 'r2', 'bello', 'tom', '2026-09-25 10:00', '2026-09-25 10:30', '2026-09-25 10:30', 'ended');
    -- Fleur uses the app and a computer, Sem a phone browser and a computer, the demo account the app.
    -- What was done in the launch hub before it moved into this hub.
    insert into launch_task (key, status, done_at) values
      ('trademark', 'done', '2026-10-03 01:00'),
      ('analytics', 'open', null),
      ('milestone:firstWalk', 'done', '2026-09-24 10:30');
    insert into outreach_contact (id, audience, name, organisation, email, city, status, last_contact_at, created_at) values
      ('c1', 'shelter', 'Sanne', 'Dierenasiel Utrecht', 'info@asiel.test', 'Utrecht', 'sent', '2026-10-03 01:30', '2026-10-03 01:20');
    insert into hub_entry (id, kind, data) values
      ('task:jurist', 'task', '{"doneAt": "2026-10-02T10:00:00.000Z"}'),
      ('task:stichting', 'task', '{"doneAt": "2026-10-02T11:00:00.000Z"}');
    insert into session (id, expires_at, token, created_at, updated_at, user_agent, user_id) values
      ('s1', '2026-11-01', 't1', '2026-10-01', '2026-10-03', 'Mozilla/5.0 (iPhone) RondjeApp/1.0', 'fleur'),
      ('s2', '2026-11-01', 't2', '2026-10-01', '2026-10-02', 'Mozilla/5.0 (Macintosh)', 'fleur'),
      ('s3', '2026-11-01', 't3', '2026-10-01', '2026-10-03', 'Mozilla/5.0 (Linux; Android 14) Mobile', 'sem'),
      ('s4', '2026-11-01', 't4', '2026-10-01', '2026-10-02', 'Mozilla/5.0 (Windows NT 10.0)', 'sem'),
      ('s5', '2026-11-01', 't5', '2026-10-01', '2026-10-03', 'Mozilla/5.0 (Macintosh)', 'ans'),
      ('s6', '2026-11-01', 't6', '2026-10-01', '2026-10-03', 'RondjeApp/1.0', 'demo'),
      ('s7', '2026-11-01', 't7', '2026-08-01', '2026-08-02', 'RondjeApp/1.0', 'tom');
  `)
}, 30_000)

afterAll(async () => {
  await client.close()
})

const counts = (steps: { n: number }[]) => steps.map((s) => s.n)

describe('the hub state', () => {
  it('keeps what was ticked off and the contacts from the launch hub', async () => {
    const state = await loadHubState()
    // The trademark check was ticked off in the launch hub; it is the same step here.
    expect(state.tasks.merkcheck).toEqual({ doneAt: '2026-10-03T01:00:00.000Z' })
    expect(state.tasks.analytics).toBeUndefined()
    // A linked step is stored in launch_task only: an old hub_entry for it does not count.
    expect(state.tasks.jurist).toBeUndefined()
    expect(state.tasks.stichting).toEqual({ doneAt: '2026-10-02T11:00:00.000Z' })
    expect(state.partners['contact-c1']).toMatchObject({ name: 'Dierenasiel Utrecht', type: 'opvang', status: 'gemaild', contact: 'Sanne' })
  })

  it('ticks off what the data shows', async () => {
    const state = await loadHubState()
    // Bello is a real dog online. Only Google is set up, so the social login step stays open.
    expect(state.tasks['eerste-hond']?.auto).toBe(true)
    expect(state.tasks['social-login']).toBeUndefined()
    expect(state.tasks['live-zetten']).toBeUndefined()
  })
})

describe('hub numbers', () => {
  it('counts each active person once, by the furthest way they used Rondje', async () => {
    const { platform } = await hubStats(null, NOW)
    // Fleur: app. Sem: phone browser. Ans: computer. Tom was last in two months ago, demo never counts.
    expect(platform).toEqual({ app: 1, mobileWeb: 1, desktopWeb: 1 })
  })

  it('keeps every funnel step within the one before', async () => {
    const { walkerFunnel, ownerFunnel } = await hubStats(null, NOW)
    // Fleur walked 3 times, Tom once before switching off, Sem only asked (without the quiz).
    expect(counts(walkerFunnel)).toEqual([3, 3, 3, 2, 2, 1])
    expect(counts(ownerFunnel)).toEqual([1, 1, 1, 1])
    for (const steps of [walkerFunnel, ownerFunnel]) {
      for (let i = 1; i < steps.length; i++) expect(steps[i].n).toBeLessThanOrEqual(steps[i - 1].n)
    }
  })
})
