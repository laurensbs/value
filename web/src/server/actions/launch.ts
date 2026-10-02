'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { AUDIENCES, CONTACT_STATUSES } from '@/components/launch/audiences'
import { isEmail } from '@/components/launch/mail'
import { audit } from '../notify'
import { isTaskKey } from '../launch-core'
import { requireAdmin } from '../session'

// The launch hub (/admin/launch): admin only. These actions only change the admin's own lists;
// nothing is ever sent to anyone from here. Contact details never go into the audit log.

const PATH = '/admin/launch'

const taskSchema = z.object({ key: z.string().refine(isTaskKey), done: z.boolean() })

/** Tick a launch task off, or back to open. */
export async function setLaunchTask(key: string, done: boolean): Promise<void> {
  const admin = await requireAdmin()
  const parsed = taskSchema.safeParse({ key, done })
  if (!parsed.success) return
  const db = await getDb()
  const values = { status: done ? 'done' : 'open', doneAt: done ? new Date() : null }
  await db
    .insert(s.launchTask)
    .values({ key: parsed.data.key, ...values })
    .onConflictDoUpdate({ target: s.launchTask.key, set: values })
  await audit(db, admin.userId, done ? 'launch.task.done' : 'launch.task.open', 'launch_task', parsed.data.key)
  revalidatePath(PATH)
}

const noteSchema = z.object({ key: z.string().refine(isTaskKey), note: z.string().trim().max(1000) })

export async function setLaunchNote(key: string, note: string): Promise<void> {
  await requireAdmin()
  const parsed = noteSchema.safeParse({ key, note })
  if (!parsed.success) return
  const db = await getDb()
  await db
    .insert(s.launchTask)
    .values({ key: parsed.data.key, note: parsed.data.note })
    .onConflictDoUpdate({ target: s.launchTask.key, set: { note: parsed.data.note } })
  revalidatePath(PATH)
}

export type ContactFormState = { ok: boolean; error?: 'invalid' | 'email'; savedAt?: number }

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)

const contactSchema = z
  .object({
    id: z.string().max(64).optional(),
    audience: z.enum(AUDIENCES),
    name: z.string().trim().max(120),
    organisation: z.string().trim().max(160),
    email: optional(200),
    phone: optional(40),
    city: z.string().trim().max(80),
    note: z.string().trim().max(1000),
  })
  .refine((c) => c.name || c.organisation)

/** Add a contact, or save changes to one (with an id). */
export async function saveContact(_prev: ContactFormState, form: FormData): Promise<ContactFormState> {
  const admin = await requireAdmin()
  const text = (key: string) => String(form.get(key) ?? '')
  const parsed = contactSchema.safeParse({
    id: text('id') || undefined,
    audience: text('audience'),
    name: text('name'),
    organisation: text('organisation'),
    email: text('email'),
    phone: text('phone'),
    city: text('city'),
    note: text('note'),
  })
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const { id, ...contact } = parsed.data
  if (contact.email && !isEmail(contact.email)) return { ok: false, error: 'email' }
  const db = await getDb()
  if (id) {
    await db.update(s.outreachContact).set(contact).where(eq(s.outreachContact.id, id))
    await audit(db, admin.userId, 'outreach.contact.edited', 'outreach_contact', id)
  } else {
    const newId = crypto.randomUUID()
    await db.insert(s.outreachContact).values({ id: newId, ...contact })
    await audit(db, admin.userId, 'outreach.contact.added', 'outreach_contact', newId)
  }
  revalidatePath(PATH)
  return { ok: true, savedAt: Date.now() }
}

const statusSchema = z.object({ id: z.string().min(1).max(64), status: z.enum(CONTACT_STATUSES) })

/** Only by the admin's own click, after they sent (or heard) something themselves. */
export async function setContactStatus(id: string, status: string): Promise<void> {
  const admin = await requireAdmin()
  const parsed = statusSchema.safeParse({ id, status })
  if (!parsed.success) return
  const db = await getDb()
  await db
    .update(s.outreachContact)
    .set(parsed.data.status === 'todo' ? { status: 'todo' } : { status: parsed.data.status, lastContactAt: new Date() })
    .where(eq(s.outreachContact.id, parsed.data.id))
  await audit(db, admin.userId, `outreach.contact.${parsed.data.status}`, 'outreach_contact', parsed.data.id)
  revalidatePath(PATH)
}

export async function deleteContact(id: string): Promise<void> {
  const admin = await requireAdmin()
  const parsed = z.string().min(1).max(64).safeParse(id)
  if (!parsed.success) return
  const db = await getDb()
  await db.delete(s.outreachContact).where(eq(s.outreachContact.id, parsed.data))
  await audit(db, admin.userId, 'outreach.contact.deleted', 'outreach_contact', parsed.data)
  revalidatePath(PATH)
}
