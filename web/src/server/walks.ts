import 'server-only'
import { and, asc, eq, gt } from 'drizzle-orm'
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
