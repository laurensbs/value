import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import migrations from '@/db/migrations.json'
import * as schema from '@/db/schema'

const client = new PGlite()
const db = drizzle({ client, schema })

vi.mock('server-only', () => ({}))
vi.mock('@/db', () => ({ getDb: async () => db }))
const del = vi.fn<(urls: string[] | string, options?: unknown) => Promise<void>>(async () => {})
vi.mock('@vercel/blob', () => ({ del }))

const { GET } = await import('./route')

const ago = (days: number) => new Date(Date.now() - days * 24 * 60 * 60_000).toISOString()
const photo = (name: string) => `https://abc123.public.blob.vercel-storage.com/photos/fleur/${name}.jpg`
const run = async (headers?: HeadersInit) => GET(new Request('http://localhost/api/cron/cleanup', { headers }))
const ids = async (table: string, walkId?: string) =>
  (await client.query<{ id: string }>(`select id::text from ${table}${walkId ? ' where walk_id = $1' : ''} order by id`, walkId ? [walkId] : []))
    .rows.map((r) => r.id)

async function walk(id: string, startedDaysAgo: number) {
  const started = ago(startedDaysAgo)
  await client.query(
    `insert into walk (id, dog_id, walker_id, started_at, planned_end_at, ended_at, status, last_lat, last_lng)
     values ($1, 'bello', 'fleur', $2, $2, $2, 'ended', 52.09, 5.12)`,
    [id, started],
  )
  await client.query(`insert into walk_point (walk_id, lat, lng, recorded_at) values ($1, 52.09, 5.12, $2), ($1, 52.1, 5.13, $2)`, [id, started])
  await client.query(`insert into walk_photo (id, walk_id, url, created_at) values ($1, $2, $3, $4)`, [`${id}-photo`, id, photo(id), started])
}

beforeAll(async () => {
  for (const m of migrations) for (const statement of m.statements) await client.exec(statement)
  await client.exec(`
    insert into "user" (id, name, email, email_verified, created_at, updated_at) values
      ('fleur', 'Fleur', 'fleur@example.org', false, now(), now()),
      ('ans', 'Ans', 'ans@example.org', false, now(), now());
    insert into dog (id, owner_id, name, country, city) values ('bello', 'ans', 'Bello', 'NL', 'Utrecht');
  `)
}, 30_000)

beforeEach(async () => {
  await client.exec(`delete from report; delete from audit_log; delete from walk; delete from suggestion;`)
  del.mockReset()
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_test_token')
  vi.stubEnv('CRON_SECRET', '')
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await client.close()
})

describe('GET /api/cron/cleanup', () => {
  it('deletes the photos of a 31-day-old walk from Vercel Blob, then its route and photo rows; a 29-day-old walk stays', async () => {
    await walk('old', 31)
    await walk('young', 29)

    const res = await run()

    expect(res.status).toBe(200)
    expect(del).toHaveBeenCalledTimes(1)
    expect(del.mock.calls[0][0]).toEqual([photo('old')])
    expect(await ids('walk_point', 'old')).toEqual([])
    expect(await ids('walk_photo', 'old')).toEqual([])
    expect((await client.query(`select last_lat, last_lng from walk where id = 'old'`)).rows[0]).toEqual({ last_lat: null, last_lng: null })
    expect(await ids('walk_point', 'young')).toHaveLength(2)
    expect(await ids('walk_photo', 'young')).toEqual(['young-photo'])
    expect(await res.json()).toMatchObject({ routesDeletedForWalks: 1, walkPointsDeleted: 2, walkPhotosDeleted: 1, blobFilesDeleted: 1, walkPhotosKept: 0 })
  })

  it('keeps the photo rows when Vercel Blob fails, so the next run tries again', async () => {
    await walk('old', 31)
    del.mockRejectedValueOnce(new Error('Vercel Blob: service unavailable'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const res = await run()

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ walkPhotosDeleted: 0, blobFilesDeleted: 0, walkPhotosKept: 1 })
    expect(await ids('walk_photo', 'old')).toEqual(['old-photo'])
    warn.mockRestore()

    expect(await (await run()).json()).toMatchObject({ walkPhotosDeleted: 1, blobFilesDeleted: 1, walkPhotosKept: 0 })
    expect(await ids('walk_photo', 'old')).toEqual([])
  })

  it('deletes private feedback after a year, unless an open report about that walk needs it', async () => {
    await walk('a', 400)
    await walk('b', 400)
    await walk('c', 400)
    await walk('d', 200)
    await client.query(
      `insert into feedback (id, walk_id, from_user_id, role, answers, created_at) values
         ('old', 'a', 'fleur', 'walker', '{}', $1), ('reported', 'b', 'fleur', 'walker', '{}', $1),
         ('closed', 'c', 'fleur', 'walker', '{}', $1), ('recent', 'd', 'fleur', 'walker', '{}', $2)`,
      [ago(366), ago(200)],
    )
    await client.exec(`
      insert into report (id, walk_id, category, description, status) values
        ('r1', 'b', 'safety', 'x', 'reviewing'), ('r2', 'c', 'safety', 'x', 'closed');
    `)

    expect(await (await run()).json()).toMatchObject({ feedbackDeleted: 2 })
    expect(await ids('feedback')).toEqual(['recent', 'reported'])
  })

  it('deletes shelter tips a year after they were handled, and open ones after two years', async () => {
    await client.query(
      `insert into suggestion (id, kind, name, country, city, suggested_by, status, handled_at, created_at) values
         ('handled-long-ago', 'shelter', 'A', 'NL', 'Utrecht', 'fleur', 'joined', $1, $3),
         ('handled-lately', 'shelter', 'B', 'NL', 'Utrecht', 'fleur', 'declined', $2, $4),
         ('open-old', 'shelter', 'C', 'NL', 'Utrecht', 'fleur', 'contacted', null, $4),
         ('open-young', 'shelter', 'D', 'NL', 'Utrecht', 'fleur', 'new', null, $3)`,
      [ago(370), ago(60), ago(400), ago(1000)],
    )
    expect(await (await run()).json()).toMatchObject({ tipsDeleted: 2 })
    expect(await ids('suggestion')).toEqual(['handled-lately', 'open-young'])
  })

  it('deletes closed reports two years after they were closed, with their audit lines; open ones always stay', async () => {
    await client.query(
      `insert into report (id, category, description, status, resolved_at, created_at) values
         ('closed-long-ago', 'safety', 'x', 'closed', $1, $3),
         ('closed-lately', 'safety', 'x', 'closed', $2, $3),
         ('closed-undated-old', 'safety', 'x', 'closed', null, $1),
         ('closed-undated-young', 'safety', 'x', 'closed', null, $2),
         ('open-old', 'safety', 'x', 'open', null, $3),
         ('reviewing-old', 'safety', 'x', 'reviewing', null, $3)`,
      [ago(731), ago(700), ago(1000)],
    )
    await client.query(
      `insert into audit_log (id, actor_id, action, target_type, target_id, data) values
         ('a1', 'fleur', 'report.created', 'report', 'closed-long-ago', '{"category":"safety"}'),
         ('a2', 'ans', 'report.closed', 'report', 'closed-long-ago', '{"resolution":"Besproken met beiden"}'),
         ('a3', 'ans', 'report.closed', 'report', 'closed-lately', '{"resolution":"Gewaarschuwd"}'),
         ('a4', 'fleur', 'report.created', 'report', 'open-old', null),
         ('a5', 'ans', 'user.banned', 'user', 'closed-long-ago', null)`,
    )

    expect(await (await run()).json()).toMatchObject({ reportsDeleted: 2, reportLogLinesDeleted: 2 })
    expect(await ids('report')).toEqual(['closed-lately', 'closed-undated-young', 'open-old', 'reviewing-old'])
    // Only lines about the deleted reports go; a line about something else with the same id stays.
    expect(await ids('audit_log')).toEqual(['a3', 'a4', 'a5'])
  })

  it('keeps the walk route of a closed report for 30 days only, like any other walk', async () => {
    await walk('reported', 31)
    await client.exec(`insert into report (id, walk_id, category, description, status, resolved_at) values ('r', 'reported', 'safety', 'x', 'closed', now())`)

    expect(await (await run()).json()).toMatchObject({ routesDeletedForWalks: 1, reportsDeleted: 0 })
    expect(await ids('walk_point', 'reported')).toEqual([])
    expect(await ids('report')).toEqual(['r'])
  })

  it('needs the secret when one is set', async () => {
    vi.stubEnv('CRON_SECRET', 'geheim')
    expect((await run()).status).toBe(401)
    expect((await run({ authorization: 'Bearer geheim' })).status).toBe(200)
  })
})
