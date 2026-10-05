import 'server-only'
import { and, asc, count, eq, gt, inArray, or, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { routeLengthM } from '@/lib/geo'
import { isAllowedPhotoUrl } from '@/lib/photos'
import { canStartWalk, isInPerson, liveLocationReason, overdueMinutes, soloTrustReason, walkHasLiveLocation } from '@/lib/rules'
import { liveLocationNow } from './live-location'
import { notify } from './notify'
import { termsBlock } from './terms'
import type { FormState } from './actions/profile'
import type { OnboardedViewer, Viewer } from './session'

export type Walk = typeof s.walk.$inferSelect

export interface WalkAccess {
  walk: Walk
  dog: typeof s.dog.$inferSelect
  /** The kind of the request the walk came from ('meet' or 'solo'), or null when that request is gone. */
  kind: string | null
  isWalker: boolean
  isWatcher: boolean
}

/** The walker, the dog's owner, its shelter's staff and admins may see a walk. */
export async function walkAccess(walkId: string, viewer: Viewer): Promise<WalkAccess | null> {
  const db = await getDb()
  const [row] = await db
    .select({ walk: s.walk, dog: s.dog, kind: s.walkRequest.kind })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .leftJoin(s.walkRequest, eq(s.walkRequest.id, s.walk.requestId))
    .where(eq(s.walk.id, walkId))
  if (!row) return null
  const isWalker = row.walk.walkerId === viewer.userId
  const isWatcher =
    row.dog.ownerId === viewer.userId || viewer.orgs.some((o) => o.id === row.dog.orgId) || viewer.isAdmin
  if (!isWalker && !isWatcher) return null
  return { ...row, isWalker, isWatcher }
}

export async function pointsSince(walkId: string, afterId = 0) {
  const db = await getDb()
  return db
    .select({ id: s.walkPoint.id, lat: s.walkPoint.lat, lng: s.walkPoint.lng, t: s.walkPoint.recordedAt })
    .from(s.walkPoint)
    .where(and(eq(s.walkPoint.walkId, walkId), gt(s.walkPoint.id, afterId)))
    .orderBy(asc(s.walkPoint.id))
    .limit(2000)
}

/** Photos shared during a walk, oldest first; `afterMs` lets the live page fetch only new ones. */
export async function walkPhotos(walkId: string, afterMs = 0) {
  const db = await getDb()
  return db
    .select({ id: s.walkPhoto.id, url: s.walkPhoto.url, t: s.walkPhoto.createdAt })
    .from(s.walkPhoto)
    .where(and(eq(s.walkPhoto.walkId, walkId), gt(s.walkPhoto.createdAt, new Date(afterMs))))
    .orderBy(asc(s.walkPhoto.createdAt))
    .limit(MAX_WALK_PHOTOS)
}

/** Enough for a few moments of a walk, not a photo album. */
export const MAX_WALK_PHOTOS = 12

/** Shared by the website and the app: the walker adds a photo to their active walk. */
export async function addPhoto(walkId: string, viewer: Viewer, url: unknown): Promise<FormState & { photo?: { id: string; url: string; t: number } }> {
  const access = await walkAccess(walkId, viewer)
  if (!access?.isWalker) return { ok: false, error: 'forbidden' }
  if (access.walk.status !== 'active') return { ok: false, error: 'not-now' }
  if (typeof url !== 'string' || !isAllowedPhotoUrl(url)) return { ok: false, error: 'invalid' }
  const db = await getDb()
  const [{ n }] = await db.select({ n: count() }).from(s.walkPhoto).where(eq(s.walkPhoto.walkId, walkId))
  if (n >= MAX_WALK_PHOTOS) return { ok: false, error: 'too-many' }
  const [row] = await db.insert(s.walkPhoto).values({ id: crypto.randomUUID(), walkId, url }).returning()
  // One notification for the first photo; after that the live page shows them as they come.
  if (n === 0) await notify(db, await watchers(access.dog), 'walk-photo', { walkId, dogName: access.dog.name })
  return { ok: true, photo: { id: row.id, url: row.url, t: row.createdAt.getTime() } }
}

export const CARE_KINDS = ['pee', 'poo', 'water'] as const
export type CareKind = (typeof CARE_KINDS)[number]
export type CareCounts = Record<CareKind, number>

/** Shared by the website and the app: one tap on the walk report, or one taken back. Null when not allowed. */
export async function logCare(walkId: string, viewer: Viewer, kind: unknown, delta: unknown): Promise<CareCounts | null> {
  if (!CARE_KINDS.includes(kind as CareKind) || (delta !== 1 && delta !== -1)) return null
  const access = await walkAccess(walkId, viewer)
  if (!access?.isWalker || access.walk.status !== 'active') return null
  const column = s.walk[kind as CareKind]
  const db = await getDb()
  const [row] = await db
    .update(s.walk)
    .set({ [kind as CareKind]: sql`least(greatest(${column} + ${delta}, 0), 20)` })
    .where(eq(s.walk.id, walkId))
    .returning({ pee: s.walk.pee, poo: s.walk.poo, water: s.walk.water })
  return row ?? null
}

/** People who should hear about this walk besides the walker. */
export async function watchers(dog: typeof s.dog.$inferSelect): Promise<string[]> {
  if (dog.ownerId) return [dog.ownerId]
  if (!dog.orgId) return []
  const db = await getDb()
  const rows = await db
    .select({ id: s.organizationMember.userId })
    .from(s.organizationMember)
    .where(eq(s.organizationMember.orgId, dog.orgId))
  return rows.map((r) => r.id)
}

/** Sends one overdue alert per walk, to the walker and the watchers. */
export async function checkOverdue(walk: Walk, dog: typeof s.dog.$inferSelect): Promise<number> {
  if (walk.status !== 'active') return 0
  const over = overdueMinutes(walk.plannedEndAt)
  if (over > 0 && !walk.overdueNotifiedAt) {
    const db = await getDb()
    await db.update(s.walk).set({ overdueNotifiedAt: new Date() }).where(eq(s.walk.id, walk.id))
    await notify(db, [walk.walkerId, ...(await watchers(dog))], 'walk-overdue', { walkId: walk.id, dogName: dog.name })
  }
  return over
}

export interface ActiveWalk {
  walkId: string
  dogName: string
  role: 'walker' | 'watcher'
}

/**
 * A walk in progress that this person is doing or following, for the "still walking" bar. Needs only
 * their id, so every page can ask it at the same time as the rest of who is signed in.
 */
export async function activeWalkFor(userId: string): Promise<ActiveWalk | null> {
  const db = await getDb()
  const myOrgs = db.select({ id: s.organizationMember.orgId }).from(s.organizationMember).where(eq(s.organizationMember.userId, userId))
  const [[mine], [theirs]] = await Promise.all([
    db
      .select({ walkId: s.walk.id, dogName: s.dog.name })
      .from(s.walk)
      .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
      .where(and(eq(s.walk.walkerId, userId), eq(s.walk.status, 'active')))
      .limit(1),
    db
      .select({ walkId: s.walk.id, dogName: s.dog.name })
      .from(s.walk)
      .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
      .where(and(eq(s.walk.status, 'active'), or(eq(s.dog.ownerId, userId), inArray(s.dog.orgId, myOrgs))))
      .limit(1),
  ])
  if (mine) return { ...mine, role: 'walker' }
  return theirs ? { ...theirs, role: 'watcher' } : null
}

/** Whether a solo walk may go ahead with the trust stored right now (rules.ts soloTrustReason). */
async function soloTrustNow(kind: string, dog: { id: string; orgId: string | null }, walkerId: string) {
  if (kind !== 'solo') return null
  const db = await getDb()
  const [grant] = await db
    .select({ soloAllowed: s.trustGrant.soloAllowed, idSeen: s.trustGrant.idSeen })
    .from(s.trustGrant)
    .where(and(eq(s.trustGrant.dogId, dog.id), eq(s.trustGrant.walkerId, walkerId)))
  return soloTrustReason(kind, dog, grant)
}

/**
 * Starts the walk for an accepted request, or returns the one already running. Shared with the app API.
 * `liveLocation` says whether this walk collects location (lib/rules.ts walkHasLiveLocation): only a
 * walk alone with the dog, with the switch on. Otherwise the phone sends no points.
 */
export async function beginWalk(requestId: string, viewer: OnboardedViewer): Promise<FormState & { walkId?: string; liveLocation?: boolean }> {
  const db = await getDb()
  const [row] = await db
    .select({ request: s.walkRequest, dog: s.dog })
    .from(s.walkRequest)
    .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId))
    .where(eq(s.walkRequest.id, requestId))
  if (!row) return { ok: false, error: 'forbidden' }
  // A dog a moderator took offline is not walked.
  if (row.dog.status === 'hidden') return { ok: false, error: 'dog-unavailable' }

  const switchedOn = await liveLocationNow()
  const liveLocation = walkHasLiveLocation(row.request.kind, switchedOn)
  const existing = await db.select().from(s.walk).where(eq(s.walk.requestId, requestId))
  const active = existing.find((w) => w.status === 'active')
  if (active && active.walkerId === viewer.userId) return { ok: true, walkId: active.id, liveLocation }
  // A first call is not a walk: no live location, ever (lib/rules.ts).
  if (!isInPerson(row.request.meetVia)) return { ok: false, error: 'needs-in-person' }
  if (!canStartWalk(row.request, viewer.userId)) return { ok: false, error: 'not-now' }
  // A solo walk starts only while the owner's yes and the ID seen still stand (also for a weekly one).
  const trust = await soloTrustNow(row.request.kind, row.dog, row.request.walkerId)
  if (trust) return { ok: false, error: trust }
  // Live location switched off: only a walk with the owner or shelter there starts (rules.ts liveLocationReason).
  const live = liveLocationReason(row.request.kind, switchedOn)
  if (live) return { ok: false, error: live }
  // Changed terms that took effect: the walker agrees to them first (rules.ts termsReason).
  const terms = await termsBlock(viewer.profile)
  if (terms) return { ok: false, error: terms }

  const id = crypto.randomUUID()
  const now = new Date()
  await db.insert(s.walk).values({
    id,
    requestId,
    dogId: row.dog.id,
    walkerId: viewer.userId,
    startedAt: now,
    plannedEndAt: new Date(now.getTime() + row.request.durationMin * 60_000),
  })
  await notify(db, await watchers(row.dog), 'walk-started', { walkId: id, dogName: row.dog.name, walkerName: viewer.profile.firstName })
  return { ok: true, walkId: id, liveLocation }
}

/** Ends an active walk: stores its length and rolls a weekly walk on. Shared with the app API. */
export async function finishWalk(walkId: string, viewer: OnboardedViewer): Promise<FormState & { distanceM?: number }> {
  const access = await walkAccess(walkId, viewer)
  if (!access?.isWalker) return { ok: false, error: 'forbidden' }
  if (access.walk.status !== 'active') return { ok: true, message: 'already-ended', distanceM: access.walk.distanceM }

  const db = await getDb()
  const points = await db
    .select({ lat: s.walkPoint.lat, lng: s.walkPoint.lng })
    .from(s.walkPoint)
    .where(eq(s.walkPoint.walkId, walkId))
    .orderBy(asc(s.walkPoint.id))
  const distanceM = routeLengthM(points)
  await db
    .update(s.walk)
    .set({ status: 'ended', endedAt: new Date(), distanceM })
    .where(eq(s.walk.id, walkId))

  if (access.walk.requestId) {
    const [request] = await db.select().from(s.walkRequest).where(eq(s.walkRequest.id, access.walk.requestId))
    if (request?.weekly && request.status === 'accepted' && !(await soloTrustNow(request.kind, access.dog, request.walkerId))) {
      // A fixed weekly walk rolls on to next week, already accepted, as long as the trust for it holds.
      await db
        .update(s.walkRequest)
        .set({ startsAt: new Date(request.startsAt.getTime() + 7 * 24 * 60 * 60_000) })
        .where(eq(s.walkRequest.id, request.id))
    } else if (request) {
      await db.update(s.walkRequest).set({ status: 'completed' }).where(eq(s.walkRequest.id, request.id))
    }
  }
  await notify(db, await watchers(access.dog), 'walk-ended', { walkId, dogName: access.dog.name })
  return { ok: true, distanceM }
}
