'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { deleteOwnDogWithFiles } from '../blob-cleanup'
import { audit } from '../notify'
import { saveDogForm } from '../dog-core'
import { dogsChanged } from '../newest-dogs'
import { actionViewer, isOrgMember } from '../session'
import type { FormState } from './profile'

export async function saveDog(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await saveDogForm(await actionViewer(), form)
  if (!result.ok) return result
  revalidatePath('/dogs')
  dogsChanged()
  redirect(result.orgId ? `/shelter/${result.orgId}` : `/dogs/${result.dogId}?saved=1`)
}

const ownerStatus = z.enum(['active', 'paused', 'adopted'])

export async function setDogStatus(dogId: string, status: 'active' | 'paused' | 'adopted'): Promise<void> {
  const parsed = ownerStatus.safeParse(status)
  if (!parsed.success) return
  const viewer = await actionViewer()
  const db = await getDb()
  const [dog] = await db.select().from(s.dog).where(eq(s.dog.id, String(dogId)))
  if (!dog || !(dog.ownerId === viewer.userId || isOrgMember(viewer, dog.orgId) || viewer.isAdmin)) return
  // A dog hidden by a moderator only comes back through a moderator.
  if (dog.status === 'hidden' && !viewer.isAdmin) return
  // A draft from the bulk screen needs a name before it can go online.
  if (parsed.data === 'active' && !dog.name.trim()) return
  await db.update(s.dog).set({ status: parsed.data }).where(eq(s.dog.id, dog.id))
  await audit(db, viewer.userId, `dog.${parsed.data}`, 'dog', dog.id)
  dogsChanged()
  revalidatePath(`/dogs/${dog.id}`)
  if (dog.orgId) revalidatePath(`/shelter/${dog.orgId}`)
}

export async function deleteDog(dogId: string): Promise<void> {
  const viewer = await actionViewer()
  // The dog, its walks and their photos, also from Vercel Blob.
  if (await deleteOwnDogWithFiles(String(dogId), viewer.userId)) dogsChanged()
  redirect('/my-dogs')
}
