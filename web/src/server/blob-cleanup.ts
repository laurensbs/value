import 'server-only'
import { del } from '@vercel/blob'
import { and, arrayOverlaps, asc, count, eq, exists, inArray, isNotNull, isNull, lt, notExists, notInArray, or, sql } from 'drizzle-orm'
import { after } from 'next/server'
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

/**
 * Of these Blob files, the ones something in the database still shows: a profile picture, a dog's
 * photos, a shelter's logo or cover, or a walk photo (other than the given walk photo rows, which
 * are about to go). Such a file is never deleted, whoever uploaded it.
 */
export async function stillUsed(urls: string[], exceptWalkPhotos: string[] = []): Promise<Set<string>> {
  const used = new Set<string>()
  if (!urls.length) return used
  const db = await getDb()
  const wanted = new Set(urls)
  const found = [
    await db.select({ url: s.profile.photoUrl }).from(s.profile).where(inArray(s.profile.photoUrl, urls)),
    await db.select({ url: s.user.image }).from(s.user).where(inArray(s.user.image, urls)),
    await db.select({ url: s.organization.logoUrl }).from(s.organization).where(inArray(s.organization.logoUrl, urls)),
    await db.select({ url: s.organization.coverUrl }).from(s.organization).where(inArray(s.organization.coverUrl, urls)),
    await db
      .select({ url: s.walkPhoto.url })
      .from(s.walkPhoto)
      .where(and(inArray(s.walkPhoto.url, urls), exceptWalkPhotos.length ? notInArray(s.walkPhoto.id, exceptWalkPhotos) : undefined)),
  ]
  for (const rows of found) for (const r of rows) if (r.url) used.add(r.url)
  const dogs = await db.select({ photos: s.dog.photos }).from(s.dog).where(arrayOverlaps(s.dog.photos, urls))
  for (const d of dogs) for (const url of d.photos) if (wanted.has(url)) used.add(url)
  return used
}

export interface FileCleanup {
  /** Files deleted from Vercel Blob. */
  deleted: number
  /** Files that could not be deleted; they stay in Blob (there is no queue to retry them). */
  failed: number
  /** Files left alone because something else still shows them. */
  inUse: number
}

/**
 * Best effort, once the rows that showed these files have changed or gone: deletes the Blob files
 * that nothing shows any more. Inline images, Google pictures and demo pictures are skipped, and
 * so is every file still in use (see stillUsed). Never throws; a failure is logged as a count only.
 */
export async function deleteUnusedFiles(
  urls: Iterable<string | null | undefined>,
  why: string,
  deleteBlobs: BlobDeleter | null = blobDeleter(),
): Promise<FileCleanup> {
  const result: FileCleanup = { deleted: 0, failed: 0, inUse: 0 }
  const files = [...new Set([...urls].filter((u): u is string => typeof u === 'string' && isBlobUrl(u)))]
  if (!files.length || !deleteBlobs) return result
  try {
    for (let i = 0; i < files.length; i += BLOB_BATCH) {
      const batch = files.slice(i, i + BLOB_BATCH)
      const used = await stillUsed(batch)
      result.inUse += used.size
      const unused = batch.filter((url) => !used.has(url))
      if (!unused.length) continue
      // After one failure the store is probably down: do not keep the person's request waiting on it.
      if (result.failed) {
        result.failed += unused.length
        continue
      }
      try {
        await deleteBlobs(unused)
        result.deleted += unused.length
      } catch {
        result.failed += unused.length
      }
    }
  } catch {
    result.failed = files.length - result.deleted - result.inUse
  }
  if (result.failed) console.warn(`[blob] could not delete ${result.failed} file(s) after ${why}; they stay in Vercel Blob`)
  return result
}

/** The same after the response has gone out, so nobody waits for Blob. */
export function deleteUnusedFilesLater(
  urls: Iterable<string | null | undefined>,
  why: string,
  deleteBlobs: BlobDeleter | null = blobDeleter(),
): void {
  const list = [...urls]
  const run = () => deleteUnusedFiles(list, why, deleteBlobs).then(() => undefined)
  try {
    after(run)
  } catch {
    // Outside a request (scripts, tests): just run it.
    void run()
  }
}

/**
 * Deletes an account and everything that cascades with it (GDPR), then the Blob files that were
 * only theirs: their profile picture, the photos of their own dogs, and the photos of the walks
 * that go with the account (walks they made, and walks of their own dogs). A shelter's dogs stay
 * with the shelter, so photos a staff member uploaded for them are never touched; and a file that
 * something else still shows is skipped anyway.
 */
export async function deleteUserWithFiles(userId: string, deleteBlobs?: BlobDeleter | null): Promise<void> {
  const db = await getDb()
  const [me] = await db
    .select({ image: s.user.image, photo: s.profile.photoUrl })
    .from(s.user)
    .leftJoin(s.profile, eq(s.profile.userId, s.user.id))
    .where(eq(s.user.id, userId))
  const dogs = await db
    .select({ id: s.dog.id, photos: s.dog.photos })
    .from(s.dog)
    .where(and(eq(s.dog.ownerId, userId), isNull(s.dog.orgId)))
  const dogIds = dogs.map((d) => d.id)
  const walkPhotos = await db
    .select({ url: s.walkPhoto.url })
    .from(s.walkPhoto)
    .innerJoin(s.walk, eq(s.walk.id, s.walkPhoto.walkId))
    .where(dogIds.length ? or(eq(s.walk.walkerId, userId), inArray(s.walk.dogId, dogIds)) : eq(s.walk.walkerId, userId))
  await db.delete(s.user).where(eq(s.user.id, userId))
  deleteUnusedFilesLater(
    [me?.image, me?.photo, ...dogs.flatMap((d) => d.photos), ...walkPhotos.map((p) => p.url)],
    'deleting an account',
    deleteBlobs,
  )
}

/**
 * An owner deletes their own dog: the dog and its walks go (cascade), then the Blob files of its
 * photos and of its walk photos that nothing else shows. False when it is not their dog.
 */
export async function deleteOwnDogWithFiles(dogId: string, ownerId: string, deleteBlobs?: BlobDeleter | null): Promise<boolean> {
  const db = await getDb()
  const mine = and(eq(s.dog.id, dogId), eq(s.dog.ownerId, ownerId), isNull(s.dog.orgId))
  const [dog] = await db.select({ photos: s.dog.photos }).from(s.dog).where(mine)
  if (!dog) return false
  const walkPhotos = await db
    .select({ url: s.walkPhoto.url })
    .from(s.walkPhoto)
    .innerJoin(s.walk, eq(s.walk.id, s.walkPhoto.walkId))
    .where(eq(s.walk.dogId, dogId))
  await db.delete(s.dog).where(mine)
  deleteUnusedFilesLater([...dog.photos, ...walkPhotos.map((p) => p.url)], 'deleting a dog', deleteBlobs)
  return true
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
  /** Photo rows deleted whose Blob file was left alone: the walker did not upload it, or something else shows it. */
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
    // upload belongs to someone else, and one shown elsewhere is still needed: only the row goes.
    const own = photos.filter((p) => isBlobUrl(p.url) && uploadedBy(p.url, walkerOf.get(p.walkId) ?? ''))
    const used = await stillUsed([...new Set(own.map((p) => p.url))], photos.map((p) => p.id))
    const files = own.filter((p) => !used.has(p.url))
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
  // Normally 0. More means walk photos point at files used elsewhere, or /api/upload changed its paths.
  if (result.filesLeft) console.warn(`[cleanup] left ${result.filesLeft} Blob file(s) alone that the walker did not upload or that are still used`)
  return result
}
