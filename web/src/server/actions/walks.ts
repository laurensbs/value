'use server'

import { asc, count, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { routeLengthM } from '@/lib/geo'
import { isAllowedPhotoUrl } from '@/lib/photos'
import { canStartWalk, feedbackNeedsReview, type OwnerFeedback, type WalkerFeedback } from '@/lib/rules'
import { audit, notify } from '../notify'
import { actionViewer } from '../session'
import { MAX_WALK_PHOTOS, walkAccess, watchers } from '../walks'
import type { FormState } from './profile'

export async function startWalk(requestId: string): Promise<FormState> {
  const viewer = await actionViewer()
  const db = await getDb()
  const [row] = await db
    .select({ request: s.walkRequest, dog: s.dog })
    .from(s.walkRequest)
    .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId))
    .where(eq(s.walkRequest.id, requestId))
  if (!row) return { ok: false, error: 'forbidden' }

  const existing = await db.select().from(s.walk).where(eq(s.walk.requestId, requestId))
  const active = existing.find((w) => w.status === 'active')
  if (active) redirect(`/walk/${active.id}`)
  if (!canStartWalk(row.request, viewer.userId)) return { ok: false, error: 'not-now' }

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
  redirect(`/walk/${id}`)
}

export async function endWalk(walkId: string): Promise<FormState> {
  const viewer = await actionViewer()
  const access = await walkAccess(walkId, viewer)
  if (!access?.isWalker) return { ok: false, error: 'forbidden' }
  if (access.walk.status !== 'active') redirect(`/walk/${walkId}`)

  const db = await getDb()
  const points = await db
    .select({ lat: s.walkPoint.lat, lng: s.walkPoint.lng })
    .from(s.walkPoint)
    .where(eq(s.walkPoint.walkId, walkId))
    .orderBy(asc(s.walkPoint.id))
  await db
    .update(s.walk)
    .set({ status: 'ended', endedAt: new Date(), distanceM: routeLengthM(points) })
    .where(eq(s.walk.id, walkId))

  if (access.walk.requestId) {
    const [request] = await db.select().from(s.walkRequest).where(eq(s.walkRequest.id, access.walk.requestId))
    if (request?.weekly && request.status === 'accepted') {
      // A fixed weekly walk rolls on to next week, already accepted.
      await db
        .update(s.walkRequest)
        .set({ startsAt: new Date(request.startsAt.getTime() + 7 * 24 * 60 * 60_000) })
        .where(eq(s.walkRequest.id, request.id))
    } else if (request) {
      await db.update(s.walkRequest).set({ status: 'completed' }).where(eq(s.walkRequest.id, request.id))
    }
  }
  await notify(db, await watchers(access.dog), 'walk-ended', { walkId, dogName: access.dog.name })
  revalidatePath('/requests')
  redirect(`/walk/${walkId}?ended=1`)
}

/** The walker shares a photo during the walk; the owner sees it on the live page and after the walk. */
export async function addWalkPhoto(walkId: string, url: string): Promise<FormState> {
  const viewer = await actionViewer()
  const access = await walkAccess(walkId, viewer)
  if (!access?.isWalker) return { ok: false, error: 'forbidden' }
  if (access.walk.status !== 'active') return { ok: false, error: 'not-now' }
  if (typeof url !== 'string' || !isAllowedPhotoUrl(url)) return { ok: false, error: 'invalid' }
  const db = await getDb()
  const [{ n }] = await db.select({ n: count() }).from(s.walkPhoto).where(eq(s.walkPhoto.walkId, walkId))
  if (n >= MAX_WALK_PHOTOS) return { ok: false, error: 'too-many' }
  await db.insert(s.walkPhoto).values({ id: crypto.randomUUID(), walkId, url })
  // One notification for the first photo; after that the live page shows them as they come.
  if (n === 0) await notify(db, await watchers(access.dog), 'walk-photo', { walkId, dogName: access.dog.name })
  return { ok: true }
}

export async function submitFeedback(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await actionViewer()
  const walkId = String(form.get('walkId') ?? '')
  const access = await walkAccess(walkId, viewer)
  if (!access) return { ok: false, error: 'forbidden' }
  const role = access.isWalker ? 'walker' : 'owner'

  let answers: OwnerFeedback | WalkerFeedback
  if (role === 'owner') {
    const dogCondition = String(form.get('dogCondition'))
    if (!['happy', 'normal', 'stressed', 'injured'].includes(dogCondition)) return { ok: false, error: 'invalid' }
    answers = {
      dogCondition: dogCondition as OwnerFeedback['dogCondition'],
      onTime: form.get('onTime') === 'yes',
      wouldAgain: form.get('wouldAgain') === 'yes',
    }
  } else {
    const dogBehaviour = String(form.get('dogBehaviour'))
    if (!['easy', 'pulled', 'reactive', 'aggressive'].includes(dogBehaviour)) return { ok: false, error: 'invalid' }
    answers = {
      dogBehaviour: dogBehaviour as WalkerFeedback['dogBehaviour'],
      handoverOk: form.get('handoverOk') === 'yes',
      feltSafe: form.get('feltSafe') === 'yes',
    }
  }
  const note = String(form.get('note') ?? '').trim().slice(0, 1000)
  const flagged = feedbackNeedsReview(role, answers)
  const db = await getDb()
  await db
    .insert(s.feedback)
    .values({ id: crypto.randomUUID(), walkId, fromUserId: viewer.userId, role, answers, note, flagged })
    .onConflictDoNothing()
  if (flagged) await audit(db, viewer.userId, 'feedback.flagged', 'walk', walkId, { role })
  return { ok: true, message: 'thanks' }
}
