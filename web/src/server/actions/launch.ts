'use server'

import { eq, isNotNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { AUDIENCES, CONTACT_STATUSES } from '@/components/launch/audiences'
import { contactKey, parseContactsCsv, type ImportError } from '@/components/launch/import'
import { isEmail } from '@/components/launch/mail'
import { DIRECTORY } from '@/lib/directory'
import { audit } from '../notify'
import { isTaskKey } from '../launch-core'
import { nearestShelters, normaliseName } from '../launch-shelters'
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

/**
 * "Zet 10 opvangen klaar": the nearest Dutch shelters from the public directory become contacts
 * with status "te sturen". Only public business details (name, town, website); the e-mail address
 * is filled in by the admin from the shelter's own website. Nothing is sent.
 */
export async function prepareShelterContacts(): Promise<{ added: number }> {
  const admin = await requireAdmin()
  const db = await getDb()
  const [contacts, partners] = await Promise.all([
    db.select({ organisation: s.outreachContact.organisation }).from(s.outreachContact),
    db.select({ directoryId: s.organization.directoryId }).from(s.organization).where(isNotNull(s.organization.directoryId)),
  ])
  const picks = nearestShelters(DIRECTORY, {
    names: new Set(contacts.map((c) => normaliseName(c.organisation))),
    ids: new Set(partners.map((p) => p.directoryId ?? '')),
  })
  for (const shelter of picks) {
    const id = crypto.randomUUID()
    await db.insert(s.outreachContact).values({
      id,
      audience: 'shelter',
      organisation: shelter.name,
      city: shelter.city ?? '',
      note: shelter.website ? `Website: ${shelter.website}` : '',
    })
    await audit(db, admin.userId, 'outreach.contact.prepared', 'outreach_contact', id)
  }
  revalidatePath(PATH)
  return { added: picks.length }
}

export type ImportState = { ok: true; added: number; duplicate: number; invalid: number } | { ok: false; error: ImportError | 'invalid'; rows?: number }

/**
 * "Importeer CSV": many contacts at once, all with status "te sturen". The CSV is checked again
 * here (the preview in the browser is only a preview): rows with an unknown audience, without a
 * name or organisation, or with a wrong e-mail address are left out, and so is every contact
 * that is already in the list (same organisation and e-mail address). Nothing is sent, and the
 * audit log only gets the number of contacts, never their details.
 */
export async function importContacts(csv: string): Promise<ImportState> {
  const admin = await requireAdmin()
  if (typeof csv !== 'string') return { ok: false, error: 'invalid' }
  const db = await getDb()
  const existing = await db.select({ organisation: s.outreachContact.organisation, email: s.outreachContact.email }).from(s.outreachContact)
  const result = parseContactsCsv(csv, existing.map(contactKey))
  if (!result.ok) return { ok: false, error: result.error, rows: result.rows }
  const fresh = result.rows.flatMap((row) => (row.status === 'new' ? [{ id: crypto.randomUUID(), ...row.contact, status: 'todo' }] : []))
  if (fresh.length) {
    await db.insert(s.outreachContact).values(fresh)
    await audit(db, admin.userId, 'outreach.contacts.imported', 'outreach_contact', 'import', { added: fresh.length })
  }
  revalidatePath(PATH)
  return { ok: true, added: fresh.length, duplicate: result.counts.duplicate, invalid: result.counts.invalid }
}
