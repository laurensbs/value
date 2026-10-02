'use server'

import { and, eq, inArray, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { audit } from '../notify'
import { actionViewer } from '../session'
import type { FormState } from './profile'

const reportSchema = z.object({
  category: z.enum(['abuse', 'safety', 'scam', 'harassment', 'fake', 'other']),
  description: z.string().trim().min(10).max(3000),
  subjectUserId: z.string().max(80).optional(),
  dogId: z.string().max(80).optional(),
  walkId: z.string().max(80).optional(),
  orgId: z.string().max(80).optional(),
})

export async function createReport(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await actionViewer()
  const opt = (k: string) => (form.get(k) ? String(form.get(k)) : undefined)
  const parsed = reportSchema.safeParse({
    category: form.get('category'),
    description: form.get('description'),
    subjectUserId: opt('subjectUserId'),
    dogId: opt('dogId'),
    walkId: opt('walkId'),
    orgId: opt('orgId'),
  })
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const db = await getDb()
  const id = crypto.randomUUID()
  await db.insert(s.report).values({ id, reporterId: viewer.userId, ...parsed.data })
  await audit(db, viewer.userId, 'report.created', 'report', id, { category: parsed.data.category })
  return { ok: true, message: 'reported' }
}

export async function blockUser(userId: string): Promise<FormState> {
  const viewer = await actionViewer()
  if (userId === viewer.userId) return { ok: false, error: 'invalid' }
  const db = await getDb()
  await db.insert(s.block).values({ blockerId: viewer.userId, blockedId: userId }).onConflictDoNothing()
  // Open requests between the two people are cancelled, in both directions.
  const theirDogs = await db.select({ id: s.dog.id }).from(s.dog).where(eq(s.dog.ownerId, userId))
  const myDogs = await db.select({ id: s.dog.id }).from(s.dog).where(eq(s.dog.ownerId, viewer.userId))
  const pairs = [
    myDogs.length ? and(eq(s.walkRequest.walkerId, userId), inArray(s.walkRequest.dogId, myDogs.map((d) => d.id))) : undefined,
    theirDogs.length ? and(eq(s.walkRequest.walkerId, viewer.userId), inArray(s.walkRequest.dogId, theirDogs.map((d) => d.id))) : undefined,
  ].filter(Boolean)
  if (pairs.length) {
    await db
      .update(s.walkRequest)
      .set({ status: 'cancelled' })
      .where(and(or(...pairs), inArray(s.walkRequest.status, ['pending', 'accepted'])))
  }
  revalidatePath('/requests')
  return { ok: true, message: 'blocked' }
}
