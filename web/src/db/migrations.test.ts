import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'
import migrations from './migrations.json'

/** Production already has 0000 with real rows; every later migration must apply on top of that. */
describe('database migrations', () => {
  it('upgrade an existing database with data, without losing it', async () => {
    const db = new PGlite()
    const [first, ...rest] = migrations
    for (const statement of first.statements) await db.exec(statement)

    await db.exec(`
      insert into "user" (id, name, email, email_verified, created_at, updated_at) values ('u1', 'Ans', 'ans@example.org', false, now(), now());
      insert into organization (id, name, country, city) values ('o1', 'Opvang', 'NL', 'Utrecht');
      insert into dog (id, owner_id, name, sex, size, energy, level, treats, walk_minutes, country, city)
        values ('d1', 'u1', 'Bello', 'male', 'medium', 'medium', 'starter', 'yes', 45, 'NL', 'Utrecht');
      insert into walk_request (id, dog_id, walker_id, kind, starts_at, duration_min) values ('r1', 'd1', 'u1', 'meet', now(), 45);
    `)

    for (const migration of rest) for (const statement of migration.statements) await db.exec(statement)

    const org = await db.query<{ treats_policy: string; provides: string[]; default_walk_minutes: number; dog_count: number | null }>(
      'select treats_policy, provides, default_walk_minutes, dog_count from organization where id = $1',
      ['o1'],
    )
    expect(org.rows[0]).toEqual({ treats_policy: 'own', provides: [], default_walk_minutes: 45, dog_count: null })
    const dog = await db.query<{ name: string }>('select name from dog where id = $1', ['d1'])
    expect(dog.rows[0]).toEqual({ name: 'Bello' })

    // Free-form tips (no directory id) never clash; a second vote for the same directory shelter does.
    await db.exec(`
      insert into suggestion (id, kind, name, country, city, suggested_by) values ('s1', 'shelter', 'X', 'NL', 'Utrecht', 'u1');
      insert into suggestion (id, kind, name, country, city, suggested_by) values ('s2', 'shelter', 'Y', 'NL', 'Utrecht', 'u1');
      insert into suggestion (id, kind, name, country, city, suggested_by, directory_id) values ('s3', 'vote', 'Z', 'NL', 'Utrecht', 'u1', 'nl-z');
    `)
    await expect(
      db.exec(`insert into suggestion (id, kind, name, country, city, suggested_by, directory_id) values ('s4', 'vote', 'Z', 'NL', 'Utrecht', 'u1', 'nl-z')`),
    ).rejects.toThrow()
    // Email preferences: on by default, language unknown until someone picks one.
    await db.exec(`insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code)
      values ('u1', 'Ans', '1950-01-01', 'NL', 'Utrecht', now(), '0.1', 'ABC234')`)
    const prefs = await db.query<{ locale: string | null; email_notifications: boolean }>('select locale, email_notifications from profile')
    expect(prefs.rows[0]).toEqual({ locale: null, email_notifications: true })

    // Requests from before the choice of how to meet were all walks together; running it twice is harmless.
    const meetVia = migrations.find((m) => m.tag === '0010_meet_via')!
    for (const statement of meetVia.statements) await db.exec(statement)
    const request = await db.query<{ meet_via: string }>('select meet_via from walk_request where id = $1', ['r1'])
    expect(request.rows[0]).toEqual({ meet_via: 'walk' })

    const tips = await db.query<{ status: string }>('select status from suggestion')
    expect(tips.rows.map((r) => r.status)).toEqual(['new', 'new', 'new'])
    await db.close()
  }, 30_000)

  it('0011 turns seintjes off for new profiles only: existing rows keep their choice', async () => {
    const db = new PGlite()
    const at = migrations.findIndex((m) => m.tag === '0011_reminders_off')
    expect(at).toBeGreaterThan(0)
    for (const migration of migrations.slice(0, at)) for (const statement of migration.statements) await db.exec(statement)

    // Before 0011: one profile with the old default (on) and one that turned seintjes off itself.
    await db.exec(`
      insert into "user" (id, name, email, email_verified, created_at, updated_at) values
        ('oud', 'Oud', 'oud@example.org', false, now(), now()),
        ('uit', 'Uit', 'uit@example.org', false, now(), now()),
        ('nieuw', 'Nieuw', 'nieuw@example.org', false, now(), now());
      insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, updated_at)
        values ('oud', 'Oud', '1950-01-01', 'NL', 'Utrecht', now(), '0.1', 'OUD234', '2026-09-01 10:00');
      insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, reminders)
        values ('uit', 'Uit', '1990-01-01', 'NL', 'Utrecht', now(), '0.1', 'UIT234', false);
    `)

    // Twice: a cold start that runs it again changes nothing.
    for (const migration of migrations.slice(at)) for (const statement of migration.statements) await db.exec(statement)
    for (const statement of migrations[at].statements) await db.exec(statement)

    await db.exec(`insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code)
      values ('nieuw', 'Nieuw', '2000-01-01', 'NL', 'Utrecht', now(), '0.1', 'NIE234')`)
    const rows = await db.query<{ user_id: string; reminders: boolean; local_nudges: boolean; updated_at: string }>(
      `select user_id, reminders, local_nudges, to_char(updated_at, 'YYYY-MM-DD HH24:MI') as updated_at from profile order by user_id`,
    )
    expect(rows.rows.map(({ user_id, reminders, local_nudges }) => ({ user_id, reminders, local_nudges }))).toEqual([
      { user_id: 'nieuw', reminders: false, local_nudges: false },
      { user_id: 'oud', reminders: true, local_nudges: false },
      { user_id: 'uit', reminders: false, local_nudges: false },
    ])
    // The existing row was not rewritten.
    expect(rows.rows.find((r) => r.user_id === 'oud')!.updated_at).toBe('2026-09-01 10:00')
    await db.close()
  }, 30_000)

  it('only ever adds: no drops or renames after the first migration', () => {
    for (const migration of migrations.slice(1)) {
      for (const statement of migration.statements) {
        expect(statement, migration.tag).not.toMatch(/\b(drop|rename)\b/i)
      }
    }
  })
})
