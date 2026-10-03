import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))

const { markProgressSeen, progressFor, syncPoints } = await import('./progress')

async function viewer(userId: string) {
  const p = await db.query.profile.findFirst({ where: (t, { eq }) => eq(t.userId, userId) })
  return { userId, email: `${userId}@example.org`, name: userId, image: null, isAdmin: false, adminUnconfirmed: false, orgs: [], profile: p! }
}

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('ans', 'Ans', 'ans@example.org', false, now(), now()),
      ('fleur', 'Fleur', 'fleur@example.org', false, now(), now()),
      ('tom', 'Tom', 'tom@example.org', false, now(), now()),
      ('mia', 'Mia', 'mia@example.org', false, now(), now());
    insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, referred_by,
      wants_to_walk, has_dogs, photo_url, bio, quiz_passed_at, weekly_goal)
    values
      ('ans', 'Ans', '1951-04-02', 'NL', 'Utrecht', now(), '1', 'ANS234', null, false, true, null, '', null, null),
      ('fleur', 'Fleur', '2003-06-15', 'NL', 'Utrecht', now(), '1', 'FLE234', null, true, false,
        'https://example.org/f.jpg', 'Ik studeer in Utrecht en mis de hond van mijn ouders.', '2026-10-01 10:00', 2),
      ('tom', 'Tom', '1990-01-01', 'NL', 'Utrecht', now(), '1', 'TOM234', 'FLE234', true, false, null, '', null, null),
      ('mia', 'Mia', '1960-02-02', 'NL', 'Utrecht', now(), '1', 'MIA234', null, false, true, null, '', null, null);
    insert into dog (id, owner_id, name, country, city, created_at) values ('bello', 'ans', 'Bello', 'NL', 'Utrecht', '2026-09-30 09:00');
    insert into dog (id, owner_id, name, country, city, status, created_at) values
      ('pip', 'mia', 'Pip', 'NL', 'Utrecht', 'paused', '2026-09-29 09:00'),
      ('saar', 'mia', 'Saar', 'NL', 'Utrecht', 'active', '2026-09-30 09:00');
    insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min, status)
      values ('r1', 'bello', 'fleur', 'meeting', '2026-10-03 05:30', 30, 'completed');
    -- Saturday 3 October, 07:30 in Amsterdam (05:30 UTC): early and in the weekend.
    insert into walk (id, request_id, dog_id, walker_id, started_at, planned_end_at, ended_at, status, distance_m, pee, poo, water)
      values ('w1', 'r1', 'bello', 'fleur', '2026-10-03 05:30', '2026-10-03 06:00', '2026-10-03 06:05', 'ended', 2100, 2, 1, 0);
    insert into walk_photo (id, walk_id, url) values ('p1', 'w1', 'https://example.org/p.jpg');
    insert into feedback (id, walk_id, from_user_id, role, answers) values ('f1', 'w1', 'fleur', 'walker', '{}');
    -- A walk still going on earns nothing yet.
    insert into walk (id, dog_id, walker_id, started_at, planned_end_at, status)
      values ('w2', 'bello', 'fleur', '2026-10-05 10:00', '2026-10-05 10:30', 'active');
  `)
}, 30_000)

afterAll(async () => {
  await client.close()
})

describe('progress', () => {
  it('adds up what a walker did', async () => {
    const p = await progressFor(await viewer('fleur'), new Date('2026-10-04T12:00:00Z'))
    // walk 25 + report 5 + photo 5 + feedback 5 + quiz 15 + profile 10 + Tom joined 25
    expect(p.points).toBe(90)
    expect(p.level).toMatchObject({ level: 3, key: 'tracker' })
    expect(p.levelUp).toBe(true)
    expect(p.walksThisWeek).toBe(1)
    expect(p.weeklyGoal).toBe(2)
    expect(p.byWalk.w1).toBe(40)
    const earned = p.badges.filter((b) => b.tier > 0).map((b) => b.key)
    expect(earned).toEqual(expect.arrayContaining(['walks', 'early', 'quiz', 'invite']))
    expect(p.newAwards).toContainEqual({ key: 'walks', tier: 1 })
    expect(p.steps.every((s) => s.done)).toBe(true)
    expect(p.recent.find((r) => r.kind === 'walk')).toMatchObject({ points: 25, dogName: 'Bello' })
  })

  it('never counts the same thing twice', async () => {
    await syncPoints('fleur')
    await syncPoints('fleur')
    const p = await progressFor(await viewer('fleur'))
    expect(p.points).toBe(90)
  })

  it('celebrates once', async () => {
    const before = await progressFor(await viewer('fleur'))
    await markProgressSeen('fleur', before.level.level)
    const after = await progressFor(await viewer('fleur'))
    expect(after.levelUp).toBe(false)
    expect(after.newAwards).toEqual([])
  })

  it('gives the owner points for their dog, and the first dog', async () => {
    const p = await progressFor(await viewer('ans'))
    expect(p.points).toBe(10 + 15)
    expect(p.badges.find((b) => b.key === 'host')).toMatchObject({ tier: 1 })
    expect(p.steps.map((s) => [s.key, s.done])).toEqual([
      ['account', true],
      ['about', false],
      ['dog', true],
      ['dogMet', true],
      ['dogWalk', true],
    ])
  })

  it('points an owner waiting for a first walker to the neighbours, until someone asks', async () => {
    const waiting = await progressFor(await viewer('mia'))
    // Her dog that is online, not the paused one.
    expect(waiting.steps.find((s) => s.key === 'dogMet')).toEqual({ key: 'dogMet', done: false, href: '/dogs/saar#share', dog: { id: 'saar', name: 'Saar' } })
    await client.exec(`insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min) values ('r2', 'saar', 'tom', 'meeting', '2026-10-06 10:00', 30)`)
    const asked = await progressFor(await viewer('mia'))
    expect(asked.steps.find((s) => s.key === 'dogMet')).toEqual({ key: 'dogMet', done: false, href: '/requests' })
  })

  it('keeps points when the dog and its walks are deleted', async () => {
    await client.exec(`delete from dog where id = 'bello'`)
    const p = await progressFor(await viewer('fleur'))
    expect(p.points).toBe(90)
    expect(p.badges.find((b) => b.key === 'walks')?.tier).toBe(1)
  })
})
