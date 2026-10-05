import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'
import migrations from './migrations.json'
import { DOGS } from './seed'

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

  it('0012 adds lesson_progress next to existing data: nothing else changes, twice is harmless, an account takes its lessons along', async () => {
    const db = new PGlite()
    const at = migrations.findIndex((m) => m.tag === '0012_lesson_progress')
    expect(at).toBeGreaterThan(0)
    for (const migration of migrations.slice(0, at)) for (const statement of migration.statements) await db.exec(statement)

    // A database as production has it: people, a profile with a passed quiz, points and a badge.
    await db.exec(`
      insert into "user" (id, name, email, email_verified, created_at, updated_at) values
        ('noor', 'Noor', 'noor@example.org', false, now(), now()),
        ('ans', 'Ans', 'ans@example.org', false, now(), now());
      insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code, quiz_passed_at, updated_at)
        values ('noor', 'Noor', '2002-02-02', 'NL', 'Utrecht', now(), '0.2', 'NOO234', '2026-10-01 09:00', '2026-10-01 09:00');
      insert into point_event (user_id, kind, ref, points, at) values ('noor', 'quiz', '', 15, now());
      insert into award (user_id, key, tier) values ('noor', 'quiz', 1);
    `)
    const before = await db.query<{ n: number }>(`select (select count(*) from profile) + (select count(*) from point_event) + (select count(*) from award) as n`)

    // Twice: a second cold start (or a preview build) that runs it again changes nothing.
    for (const statement of migrations[at].statements) await db.exec(statement)
    for (const migration of migrations.slice(at)) for (const statement of migration.statements) await db.exec(statement)

    const after = await db.query<{ n: number }>(`select (select count(*) from profile) + (select count(*) from point_event) + (select count(*) from award) as n`)
    expect(after.rows[0].n).toEqual(before.rows[0].n)
    const noor = await db.query<{ quiz: string; updated: string }>(
      `select to_char(quiz_passed_at, 'YYYY-MM-DD HH24:MI') as quiz, to_char(updated_at, 'YYYY-MM-DD HH24:MI') as updated from profile where user_id = 'noor'`,
    )
    expect(noor.rows[0]).toEqual({ quiz: '2026-10-01 09:00', updated: '2026-10-01 09:00' })

    // One row per lesson: the same lesson again is refused, and the time is filled in.
    await db.exec(`insert into lesson_progress (user_id, lesson_id) values ('noor', 'hello'), ('noor', 'body'), ('ans', 'hello')`)
    await expect(db.exec(`insert into lesson_progress (user_id, lesson_id) values ('noor', 'hello')`)).rejects.toThrow()
    await expect(db.exec(`insert into lesson_progress (user_id, lesson_id) values ('niemand', 'hello')`)).rejects.toThrow()
    const rows = await db.query<{ user_id: string; lesson_id: string; has_time: boolean }>(
      `select user_id, lesson_id, completed_at is not null as has_time from lesson_progress order by user_id, lesson_id`,
    )
    expect(rows.rows).toEqual([
      { user_id: 'ans', lesson_id: 'hello', has_time: true },
      { user_id: 'noor', lesson_id: 'body', has_time: true },
      { user_id: 'noor', lesson_id: 'hello', has_time: true },
    ])

    // Removing an account (GDPR) removes its lessons, and only its own.
    await db.exec(`delete from "user" where id = 'noor'`)
    const left = await db.query<{ user_id: string }>('select user_id from lesson_progress')
    expect(left.rows).toEqual([{ user_id: 'ans' }])
    await db.close()
  }, 30_000)

  it('0013 gives example dogs the new texts: only unedited examples change, real dogs never, and twice is harmless', async () => {
    const db = new PGlite()
    const at = migrations.findIndex((m) => m.tag === '0013_demo_texts')
    expect(at).toBeGreaterThan(0)
    for (const migration of migrations.slice(0, at)) for (const statement of migration.statements) await db.exec(statement)

    // The example texts production was seeded with (seed.ts before 5 Oct 2026): they named the owner.
    const old = {
      saar: 'Ans loopt sinds haar nieuwe heup alleen nog kleine stukjes. Saar is gewend aan lange rondjes langs de Singel en mist ze.',
      saarNeeds: 'Twee extra rondjes per week houden Saar fit tot Ans weer verder kan lopen.',
      pip: 'Henk heeft COPD. Een blokje om lukt nog, het park niet meer. Pip kijkt elke middag naar de deur.',
      tess: 'Marian is midden in een chemokuur en te moe om Tess uit te laten. Een vaste wandelaar geeft rust.',
      tessNeeds: 'Voor een paar maanden, op dinsdag en vrijdag.',
      bolle: 'Paul loopt met een rollator. Het rondje naar het Citadelpark lukt niet meer, het praatje na afloop mist hij het meest.',
      luna: 'Carmen ya no puede seguir el ritmo de Luna. En el Retiro, Luna es feliz con una pelota.',
    }
    const dogs: [id: string, isDemo: boolean, story: string, needs: string][] = [
      ['demo-saar', true, old.saar, old.saarNeeds],
      ['demo-tess', true, old.tess, old.tessNeeds],
      ['demo-luna', true, old.luna, 'Mucho movimiento, idealmente por la mañana.'],
      // An example text an admin already changed: left as it is.
      ['demo-pip', true, 'Pip is al elf jaar mijn maatje.', 'Eén kort rondje per dag is genoeg.'],
      // A real dog with an example id, or with the exact example text, or an example not in the list: never touched.
      ['demo-bolle', false, old.bolle, ''],
      ['echt-1', false, old.saar, old.saarNeeds],
      ['demo-mo', true, old.pip, old.tessNeeds],
    ]
    for (const [id, isDemo, story, needs] of dogs) {
      await db.query(`insert into dog (id, name, country, city, story, needs, is_demo, updated_at) values ($1, $1, 'NL', 'Utrecht', $2, $3, $4, '2026-10-02 10:00')`, [
        id,
        story,
        needs,
        isDemo,
      ])
    }

    // Twice: a second cold start runs it again and changes nothing more.
    for (const migration of migrations.slice(at)) for (const statement of migration.statements) await db.exec(statement)
    for (const statement of migrations[at].statements) await db.exec(statement)

    const rows = await db.query<{ id: string; story: string; needs: string; updated: string }>(
      `select id, story, needs, to_char(updated_at, 'YYYY-MM-DD HH24:MI') as updated from dog order by id`,
    )
    const byId = Object.fromEntries(rows.rows.map((r) => [r.id, r]))
    const seeded = (id: string) => DOGS.find((d) => d.id === id)!
    // The new texts are exactly the ones a fresh database gets from seed.ts.
    expect(byId['demo-saar']).toMatchObject({ story: seeded('demo-saar').story, needs: seeded('demo-saar').needs })
    expect(byId['demo-tess']).toMatchObject({ story: seeded('demo-tess').story, needs: seeded('demo-tess').needs })
    expect(byId['demo-luna']).toMatchObject({ story: seeded('demo-luna').story, needs: 'Mucho movimiento, idealmente por la mañana.' })
    expect(byId['demo-pip']).toMatchObject({ story: 'Pip is al elf jaar mijn maatje.', needs: 'Eén kort rondje per dag is genoeg.' })
    expect(byId['demo-bolle']).toMatchObject({ story: old.bolle, needs: '' })
    expect(byId['echt-1']).toMatchObject({ story: old.saar, needs: old.saarNeeds })
    expect(byId['demo-mo']).toMatchObject({ story: old.pip, needs: old.tessNeeds })
    // Rows are not rewritten otherwise: "last changed" stays as it was.
    expect(rows.rows.map((r) => r.updated)).toEqual(rows.rows.map(() => '2026-10-02 10:00'))
    await db.close()
  }, 30_000)

  it('the example dogs in seed.ts tell about the dog, never about their made-up owner', () => {
    const owners = ['Ans', 'Henk', 'Marian', 'Paul', 'Carmen']
    for (const dog of DOGS) {
      const text = [dog.story, dog.needs, dog.treatsNote, ...(dog.traits ?? [])].join(' ')
      for (const name of owners) expect(text, `${dog.id} ${name}`).not.toMatch(new RegExp(`\\b${name}\\b`))
      // Nor their health, or when someone is at home.
      expect(text, dog.id).not.toMatch(/COPD|chemo|heup|rollator|ritmo|dinsdag|vrijdag|elke middag/i)
    }
  })

  it('only ever adds: no drops or renames after the first migration', () => {
    for (const migration of migrations.slice(1)) {
      for (const statement of migration.statements) {
        expect(statement, migration.tag).not.toMatch(/\b(drop|rename)\b/i)
      }
    }
  })
})
