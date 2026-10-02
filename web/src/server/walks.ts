import 'server-only'
import { and, asc, eq, gt, inArray, or } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { overdueMinutes } from '@/lib/rules'
import { notify } from './notify'
import type { Viewer } from './session'

export type Walk = typeof s.walk.$inferSelect

export interface WalkAccess {
  walk: Walk
  dog: typeof s.dog.$inferSelect
  isWalker: boolean
  isWatcher: boolean
}

/** The walker, the dog's owner, its shelter's staff and admins may see a walk. */
export async function walkAccess(walkId: string, viewer: Viewer): Promise<WalkAccess | null> {
  const db = await getDb()
  const [row] = await db
    .select({ walk: s.walk, dog: s.dog })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
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

/** A walk in progress that this person is doing or following, for the "still walking" bar. */
export async function activeWalkFor(viewer: Viewer): Promise<ActiveWalk | null> {
  const db = await getDb()
  const [mine] = await db
    .select({ walkId: s.walk.id, dogName: s.dog.name })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .where(and(eq(s.walk.walkerId, viewer.userId), eq(s.walk.status, 'active')))
    .limit(1)
  if (mine) return { ...mine, role: 'walker' }
  const orgIds = viewer.orgs.map((o) => o.id)
  const [theirs] = await db
    .select({ walkId: s.walk.id, dogName: s.dog.name })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .where(
      and(
        eq(s.walk.status, 'active'),
        orgIds.length ? or(eq(s.dog.ownerId, viewer.userId), inArray(s.dog.orgId, orgIds)) : eq(s.dog.ownerId, viewer.userId),
      ),
    )
    .limit(1)
  return theirs ? { ...theirs, role: 'watcher' } : null
}
