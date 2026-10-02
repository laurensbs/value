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
    const tips = await db.query<{ status: string }>('select status from suggestion')
    expect(tips.rows.map((r) => r.status)).toEqual(['new', 'new', 'new'])
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
