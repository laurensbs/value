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

const { blobDeleter, isBlobUrl, purgeOldWalks, uploadedBy } = await import('./blob-cleanup')

const now = new Date('2026-10-03T03:15:00Z')
const daysBefore = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60_000).toISOString()
const BLOB = 'https://abc123.public.blob.vercel-storage.com'
const file = (user: string, name: string) => `${BLOB}/photos/${user}/${name}.jpg`

/** A walk with a route of three points, an end position and the given photos. */
async function walk(id: string, startedDaysAgo: number, photos: string[]) {
  const started = daysBefore(startedDaysAgo)
  await client.query(
    `insert into walk (id, dog_id, walker_id, started_at, planned_end_at, ended_at, status, last_lat, last_lng, last_at)
     values ($1, 'bello', 'fleur', $2, $2, $2, 'ended', 52.09, 5.12, $2)`,
    [id, started],
  )
  for (let i = 0; i < 3; i++) {
    await client.query(`insert into walk_point (walk_id, lat, lng, recorded_at) values ($1, 52.09, 5.12, $2)`, [id, started])
  }
  for (const [i, url] of photos.entries()) {
    await client.query(`insert into walk_photo (id, walk_id, url, created_at) values ($1, $2, $3, $4)`, [`${id}-p${i}`, id, url, started])
  }
}

async function left(id: string) {
  const one = async (q: string) => Number((await client.query<{ n: number }>(q, [id])).rows[0].n)
  const end = await client.query<{ last_lat: number | null; last_lng: number | null }>(`select last_lat, last_lng from walk where id = $1`, [id])
  return {
    points: await one(`select count(*)::int as n from walk_point where walk_id = $1`),
    photos: await one(`select count(*)::int as n from walk_photo where walk_id = $1`),
    endPosition: end.rows[0].last_lat !== null || end.rows[0].last_lng !== null,
  }
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
  await client.exec(`delete from report; delete from walk;`)
  del.mockClear()
})

afterAll(async () => {
  await client.close()
})

describe('purgeOldWalks', () => {
  it('deletes a 31-day-old walk’s photos from Blob first, then its route, end position and photo rows', async () => {
    await walk('old', 31, [file('fleur', 'a'), file('fleur', 'b'), 'data:image/jpeg;base64,AAAA'])
    await walk('young', 29, [file('fleur', 'c')])
    const deleted: string[][] = []
    const deleteBlobs = vi.fn(async (urls: string[]) => {
      // The rows are still there while the files are deleted: a crash in between loses nothing.
      expect((await left('old')).photos).toBe(3)
      deleted.push(urls)
    })

    const result = await purgeOldWalks({ now, deleteBlobs })

    expect(deleted).toEqual([[file('fleur', 'a'), file('fleur', 'b')]])
    expect(await left('old')).toEqual({ points: 0, photos: 0, endPosition: false })
    expect(result).toEqual({ walks: 1, points: 3, photos: 3, files: 2, photosKept: 0, filesLeft: 0 })
    // Younger than 30 days: untouched.
    expect(await left('young')).toEqual({ points: 3, photos: 1, endPosition: true })
    // Nothing left to do the next day.
    expect(await purgeOldWalks({ now, deleteBlobs })).toMatchObject({ walks: 0, files: 0 })
    expect(deleteBlobs).toHaveBeenCalledTimes(1)
  })

  it('leaves a 29-day-old walk alone', async () => {
    await walk('young', 29, [file('fleur', 'c')])
    const deleteBlobs = vi.fn(async () => {})
    expect(await purgeOldWalks({ now, deleteBlobs })).toMatchObject({ walks: 0, points: 0, photos: 0 })
    expect(deleteBlobs).not.toHaveBeenCalled()
    expect(await left('young')).toEqual({ points: 3, photos: 1, endPosition: true })
  })

  it('keeps the photo rows when Blob fails, and deletes them on the next run', async () => {
    await walk('old', 31, [file('fleur', 'a')])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const failing = vi.fn(async () => {
      throw new Error('Vercel Blob: service unavailable')
    })

    expect(await purgeOldWalks({ now, deleteBlobs: failing })).toMatchObject({ photos: 0, files: 0, photosKept: 1 })
    // The route has no files and goes anyway; the photo stays so its file is not lost track of.
    expect(await left('old')).toEqual({ points: 0, photos: 1, endPosition: false })
    // Only a count is logged, never a link to someone's photo.
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toMatch(/kept 1 walk photo/)
    expect(String(warn.mock.calls[0][0])).not.toContain('blob.vercel-storage.com')
    warn.mockRestore()

    const working = vi.fn(async () => {})
    expect(await purgeOldWalks({ now, deleteBlobs: working })).toMatchObject({ walks: 1, photos: 1, files: 1, photosKept: 0 })
    expect(working).toHaveBeenCalledWith([file('fleur', 'a')])
    expect(await left('old')).toEqual({ points: 0, photos: 0, endPosition: false })
  })

  it('stops calling Blob after a few failures in one run', async () => {
    // 30 walks with 12 photos each: four calls of 100 files.
    for (let w = 0; w < 30; w++) await walk(`old${w}`, 40, Array.from({ length: 12 }, (_, i) => file('fleur', `${w}-${i}`)))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const failing = vi.fn(async () => {
      throw new Error('down')
    })
    expect(await purgeOldWalks({ now, deleteBlobs: failing })).toMatchObject({ walks: 30, points: 90, photos: 0, photosKept: 360 })
    expect(failing).toHaveBeenCalledTimes(3)
    vi.mocked(console.warn).mockRestore()
  })

  it('without a Blob store keeps the Blob photos, so their files are not orphaned', async () => {
    await walk('old', 31, [file('fleur', 'a'), 'data:image/jpeg;base64,AAAA'])
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await purgeOldWalks({ now, deleteBlobs: null })).toMatchObject({ points: 3, photos: 1, files: 0, photosKept: 1 })
    expect(await left('old')).toEqual({ points: 0, photos: 1, endPosition: false })
    vi.mocked(console.warn).mockRestore()
  })

  it('keeps a walk with an open report, and cleans it once the report is closed', async () => {
    await walk('reported', 40, [file('fleur', 'a')])
    await client.exec(`insert into report (id, walk_id, category, description, status) values ('r1', 'reported', 'safety', 'x', 'open')`)
    const deleteBlobs = vi.fn(async () => {})
    expect(await purgeOldWalks({ now, deleteBlobs })).toMatchObject({ walks: 0 })
    expect(await left('reported')).toEqual({ points: 3, photos: 1, endPosition: true })

    await client.exec(`update report set status = 'closed' where id = 'r1'`)
    expect(await purgeOldWalks({ now, deleteBlobs })).toMatchObject({ walks: 1, files: 1 })
    expect(await left('reported')).toEqual({ points: 0, photos: 0, endPosition: false })
  })

  it('never deletes a file the walker did not upload, such as the dog’s own portrait', async () => {
    await walk('old', 31, [file('ans', 'bello-portrait'), 'https://example.org/demo.jpg'])
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const deleteBlobs = vi.fn(async () => {})
    expect(await purgeOldWalks({ now, deleteBlobs })).toMatchObject({ photos: 2, files: 0, filesLeft: 1 })
    expect(deleteBlobs).not.toHaveBeenCalled()
    expect(await left('old')).toEqual({ points: 0, photos: 0, endPosition: false })
    vi.mocked(console.warn).mockRestore()
  })
})

describe('blobDeleter', () => {
  it('only exists with a Blob store, and then deletes through @vercel/blob', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '')
    expect(blobDeleter()).toBeNull()
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_test_token')
    await blobDeleter()!([file('fleur', 'a')])
    expect(del).toHaveBeenCalledWith([file('fleur', 'a')], { abortSignal: expect.any(AbortSignal) })
    vi.unstubAllEnvs()
  })
})

describe('Blob URLs', () => {
  it('recognises files in a Blob store and who uploaded them', () => {
    expect(isBlobUrl(file('fleur', 'a'))).toBe(true)
    expect(isBlobUrl('data:image/jpeg;base64,AAAA')).toBe(false)
    expect(isBlobUrl('https://evil.example/x.public.blob.vercel-storage.com/a.jpg')).toBe(false)
    expect(isBlobUrl('http://abc.public.blob.vercel-storage.com/a.jpg')).toBe(false)
    expect(uploadedBy(file('fleur', 'a'), 'fleur')).toBe(true)
    expect(uploadedBy(file('fleurtje', 'a'), 'fleur')).toBe(false)
    expect(uploadedBy(`${BLOB}/photos/fleur/../ans/a.jpg`, 'fleur')).toBe(false)
    expect(uploadedBy(`${BLOB}/photos//a.jpg`, '')).toBe(false)
  })
})
