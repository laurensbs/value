'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isPostId, POST_PREFIX } from '@/components/marketing-hub/posts'
import { audit } from './notify'
import { requireAdmin } from './session'

// The marketing hub (/admin/marketing): admin only. Nothing is ever posted or sent from here;
// "Gepost" is the admin's own note that they posted something themselves. Stored in the
// existing launch_task table as "post:<id>" (no new table).

const postSchema = z.object({ id: z.string().refine(isPostId), done: z.boolean() })

export async function setPostDone(id: string, done: boolean): Promise<void> {
  const admin = await requireAdmin()
  const parsed = postSchema.safeParse({ id, done })
  if (!parsed.success) return
  const key = POST_PREFIX + parsed.data.id
  const values = { status: done ? 'done' : 'open', doneAt: done ? new Date() : null }
  const db = await getDb()
  await db
    .insert(s.launchTask)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: s.launchTask.key, set: values })
  await audit(db, admin.userId, done ? 'marketing.post.done' : 'marketing.post.open', 'launch_task', key)
  revalidatePath('/admin/marketing')
}
