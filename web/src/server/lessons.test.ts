import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

// Two databases: one fully migrated, and one like production before 0012 (what a preview talks to).
const client = new PGlite()
const before = new PGlite()
const databases = { now: drizzle({ client, schema }), before: drizzle({ client: before, schema }) }
let current: keyof typeof databases = 'now'
let signedIn: string | null = null

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => databases[current] }))
vi.mock('./session', () => ({
  getViewer: async () => {
    if (!signedIn) return null
    const profile = await databases[current].query.profile.findFirst({ where: (t, { eq }) => eq(t.userId, signedIn!) })
    return { userId: signedIn, email: `${signedIn}@example.org`, name: signedIn, image: null, isAdmin: false, adminUnconfirmed: false, orgs: [], profile: profile ?? null }
  },
}))

const { lessonsDoneBy, markLessonsDone } = await import('./lessons')
const { saveLessons } = await import('./actions/lessons')

const people = `
  insert into "user" (id, name, email, email_verified, created_at, updated_at) values
    ('noor', 'Noor', 'noor@example.org', false, now(), now()),
    ('gast', 'Gast', 'gast@example.org', false, now(), now());
  insert into profile (user_id, first_name, birth_date, country, city, terms_accepted_at, terms_version, referral_code)
    values ('noor', 'Noor', '2002-02-02', 'NL', 'Utrecht', now(), '0.2', 'NOO234');
`

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  for (const m of migrations.filter((m) => m.tag !== '0012_lesson_progress')) for (const statement of m.statements) await before.exec(statement)
  await client.exec(people)
  await before.exec(people)
}, 30_000)

afterAll(async () => {
  await client.close()
  await before.close()
})

describe('lesson progress', () => {
  it('stores real lessons only, each once, and gives them back in path order', async () => {
    expect(await lessonsDoneBy('noor')).toEqual([])
    expect(await markLessonsDone('noor', ['meet', 'hello', 'nope', 'hello'])).toEqual(['hello', 'meet'])
    // The same lesson again (a second device, the guest merge) keeps the first time.
    const [{ at }] = (await client.query<{ at: string }>(`select completed_at::text as at from lesson_progress where user_id = 'noor' and lesson_id = 'hello'`)).rows
    expect(await markLessonsDone('noor', ['hello', 'body'])).toEqual(['hello', 'body', 'meet'])
    const [{ at: again }] = (await client.query<{ at: string }>(`select completed_at::text as at from lesson_progress where user_id = 'noor' and lesson_id = 'hello'`)).rows
    expect(again).toBe(at)
    expect(await markLessonsDone('noor', 'hello')).toEqual(['hello', 'body', 'meet'])
  })

  it('gives no points and no badge, and changes nothing about the quiz', async () => {
    await markLessonsDone('noor', ['hello', 'body', 'meet', 'weather', 'help'])
    expect(await lessonsDoneBy('noor')).toEqual(['hello', 'body', 'meet', 'weather', 'help'])
    const points = await client.query<{ n: number }>(`select count(*)::int as n from point_event`)
    const awards = await client.query<{ n: number }>(`select count(*)::int as n from award`)
    expect(points.rows[0].n).toBe(0)
    expect(awards.rows[0].n).toBe(0)
    const quiz = await client.query<{ quiz_passed_at: string | null }>(`select quiz_passed_at from profile where user_id = 'noor'`)
    expect(quiz.rows[0].quiz_passed_at).toBeNull()
  })

  it('only for someone with a profile: a guest keeps the lessons in the browser', async () => {
    signedIn = null
    expect(await saveLessons(['hello'])).toEqual({ ok: false, done: [] })
    signedIn = 'gast' // an account without a profile yet (still in onboarding)
    expect(await saveLessons(['hello'])).toEqual({ ok: false, done: [] })
    expect(await lessonsDoneBy('gast')).toEqual([])
    signedIn = 'noor'
    expect(await saveLessons(['hello'])).toEqual({ ok: true, done: ['hello', 'body', 'meet', 'weather', 'help'] })
    signedIn = null
  })

  it('on a database without the table yet (a preview), the page keeps working and the browser keeps the lessons', async () => {
    current = 'before'
    try {
      expect(await lessonsDoneBy('noor')).toEqual([])
      expect(await markLessonsDone('noor', ['hello'])).toBeNull()
      signedIn = 'noor'
      expect(await saveLessons(['hello'])).toEqual({ ok: false, done: [] })
    } finally {
      current = 'now'
      signedIn = null
    }
  })
})
