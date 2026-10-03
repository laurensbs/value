import 'server-only'
import { del } from '@vercel/blob'
import { and, asc, count, eq, exists, inArray, isNotNull, lt, notExists, or, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { ROUTE_RETENTION_DAYS } from '@/lib/rules'

/**
 * Deletes files from Vercel Blob and throws when the store did not confirm it. Deleting a file
 * that is already gone is fine for the Blob API, so retrying after a half-finished run is safe.
 */
export type BlobDeleter = (urls: string[]) => Promise<void>

/** Files per call to the Blob API. */
const BLOB_BATCH = 100
/** One call may take this long (the SDK itself retries on errors) before this run gives up on it. */
const BLOB_TIMEOUT_MS = 30_000
/** After this many failed calls the rest waits for the next run: the store is probably down. */
const MAX_BLOB_FAILURES = 3
/** Walks cleaned per round of database writes. */
const WALK_BATCH = 100
/** While a report about a walk is in one of these states, its route and photos stay (privacy statement, section 5). */
export const OPEN_REPORT = ['open', 'reviewing']

/** The real deleter, only when a Blob store is connected; without one nothing can be deleted there. */
export function blobDeleter(): BlobDeleter | null {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null
  return (urls) => del(urls, { abortSignal: AbortSignal.timeout(BLOB_TIMEOUT_MS) })
}

/** A file in a Vercel Blob store (what /api/upload makes), not an inline image or a demo picture. */
export function isBlobUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

/**
 * Whether this person uploaded the file: /api/upload stores everything under photos/<userId>/.
 * A walk photo can only point at any Blob file, so this keeps a walker from getting someone
 * else's photo (a dog's portrait, a profile picture) deleted through their walk.
 */
export function uploadedBy(url: string, userId: string): boolean {
  try {
    return userId !== '' && new URL(url).pathname.startsWith(`/photos/${userId}/`)
  } catch {
    return false
  }
}

export interface WalkPurge {
  /** Older walks that still had a route, an end position or photos at the start of this run. */
  walks: number
  /** Route points deleted. */
  points: number
  /** Photo rows deleted. */
  photos: number
  /** Files deleted from Vercel Blob. */
  files: number
  /** Photos kept because their file could not be deleted from Blob yet; the next run tries again. */
  photosKept: number
  /** Photo rows deleted that pointed at a Blob file the walker did not upload, which was left alone. */
  filesLeft: number
}

/**
 * The privacy promise: routes and walk photos are gone after 30 days, unless an open report needs
 * that walk. For every older walk this deletes the route points, the last known position and the
 * photos. Photo files in Vercel Blob go first, and a photo's row only goes once its file is gone:
 * if Blob fails, the row stays and the next run tries again, instead of leaving a file behind
 * that nothing points to any more. Nothing is logged about who or where, only counts.
 */
export async function purgeOldWalks({
  now = new Date(),
  deleteBlobs = blobDeleter(),
}: { now?: Date; deleteBlobs?: BlobDeleter | null } = {}): Promise<WalkPurge> {
  const db = await getDb()
  const cutoff = new Date(now.getTime() - ROUTE_RETENTION_DAYS * 24 * 60 * 60_000)
  const due = await db
    .select({ id: s.walk.id, walkerId: s.walk.walkerId })
    .from(s.walk)
    .where(
      and(
        lt(s.walk.startedAt, cutoff),
        notExists(
          db
            .select({ one: sql`1` })
            .from(s.report)
            .where(and(eq(s.report.walkId, s.walk.id), inArray(s.report.status, OPEN_REPORT))),
        ),
        or(
          isNotNull(s.walk.lastLat),
          isNotNull(s.walk.lastLng),
          exists(db.select({ one: sql`1` }).from(s.walkPoint).where(eq(s.walkPoint.walkId, s.walk.id))),
          exists(db.select({ one: sql`1` }).from(s.walkPhoto).where(eq(s.walkPhoto.walkId, s.walk.id))),
        ),
      ),
    )
    .orderBy(asc(s.walk.startedAt))

  const result: WalkPurge = { walks: due.length, points: 0, photos: 0, files: 0, photosKept: 0, filesLeft: 0 }
  let failures = 0
  for (let i = 0; i < due.length; i += WALK_BATCH) {
    const chunk = due.slice(i, i + WALK_BATCH)
    const ids = chunk.map((w) => w.id)
    const walkerOf = new Map(chunk.map((w) => [w.id, w.walkerId]))

    // The route and the end position hold no files: they always go.
    const [{ n }] = await db.select({ n: count() }).from(s.walkPoint).where(inArray(s.walkPoint.walkId, ids))
    if (n > 0) await db.delete(s.walkPoint).where(inArray(s.walkPoint.walkId, ids))
    result.points += n
    await db
      .update(s.walk)
      .set({ lastLat: null, lastLng: null })
      .where(and(inArray(s.walk.id, ids), or(isNotNull(s.walk.lastLat), isNotNull(s.walk.lastLng))))

    const photos = await db
      .select({ id: s.walkPhoto.id, walkId: s.walkPhoto.walkId, url: s.walkPhoto.url })
      .from(s.walkPhoto)
      .where(inArray(s.walkPhoto.walkId, ids))
    // An inline image (no Blob store) lives in the row itself. A Blob file the walker did not
    // upload belongs to someone else: only the row goes, the file stays where it is used.
    const files = photos.filter((p) => isBlobUrl(p.url) && uploadedBy(p.url, walkerOf.get(p.walkId) ?? ''))
    const gone = photos.filter((p) => !files.includes(p)).map((p) => p.id)
    result.filesLeft += photos.filter((p) => isBlobUrl(p.url) && !files.includes(p)).length
    for (let j = 0; j < files.length; j += BLOB_BATCH) {
      const batch = files.slice(j, j + BLOB_BATCH)
      if (!deleteBlobs || failures >= MAX_BLOB_FAILURES) {
        result.photosKept += batch.length
        continue
      }
      const urls = [...new Set(batch.map((p) => p.url))]
      try {
        await deleteBlobs(urls)
        result.files += urls.length
        gone.push(...batch.map((p) => p.id))
      } catch {
        failures += 1
        result.photosKept += batch.length
      }
    }
    if (gone.length) await db.delete(s.walkPhoto).where(inArray(s.walkPhoto.id, gone))
    result.photos += gone.length
  }

  if (result.photosKept) {
    const why = deleteBlobs ? 'Vercel Blob did not delete them' : 'no Blob store is connected (BLOB_READ_WRITE_TOKEN)'
    console.warn(`[cleanup] kept ${result.photosKept} walk photo(s) older than ${ROUTE_RETENTION_DAYS} days: ${why}; the next run tries again`)
  }
  // Normally 0. More means walk photos point at other people's files, or /api/upload changed its paths.
  if (result.filesLeft) console.warn(`[cleanup] left ${result.filesLeft} Blob file(s) alone that the walker did not upload`)
  return result
}
