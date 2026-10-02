'use server'

import { and, count, eq, gte, inArray, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isCountry } from '@/lib/countries'
import { directoryEntry } from '@/lib/directory'
import { normalizeWebsite } from '@/lib/org-fields'
import { scanText } from '@/lib/rules'
import { matchDirectory, MAX_TIPS_PER_DAY, tipKey, TIP_STATUSES } from '@/lib/tips'
import { audit } from '../notify'
import { actionViewer, requireAdmin } from '../session'
import type { FormState } from './profile'

export type TipState = FormState & { orgId?: string; name?: string }

const tipSchema = z.object({
  name: z.string().trim().min(2).max(120),
  country: z.string().refine(isCountry),
  city: z.string().trim().min(1).max(60),
  website: z.string().trim().max(200).default(''),
  note: z.string().trim().max(600).default(''),
})

async function tipsToday(userId: string): Promise<number> {
  const db = await getDb()
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.suggestion)
    .where(and(eq(s.suggestion.suggestedBy, userId), gte(s.suggestion.createdAt, new Date(Date.now() - 24 * 60 * 60_000))))
  return n
}

/**
 * A tip about a shelter that should be on Rondje. Rondje follows up by hand and never contacts
 * anyone in the tipper's name. A shelter from our directory counts as a vote for it.
 */
export async function suggestShelter(_prev: TipState, form: FormData): Promise<TipState> {
  const viewer = await actionViewer()
  const parsed = tipSchema.safeParse({
    name: form.get('name'),
    country: form.get('country'),
    city: form.get('city'),
    website: form.get('website') ?? '',
    note: form.get('note') ?? '',
  })
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const tip = parsed.data
  // Tips are about organisations, never about private people: no phone numbers, emails or bank details.
  const flags = scanText(`${tip.name} ${tip.note}`)
  if (flags.includes('phone') || flags.includes('email') || flags.includes('iban')) return { ok: false, error: 'contact' }
  const website = tip.website ? normalizeWebsite(tip.website) : null
  if (tip.website && !website) return { ok: false, error: 'website' }
  if ((await tipsToday(viewer.userId)) >= MAX_TIPS_PER_DAY) return { ok: false, error: 'too-many' }

  const db = await getDb()
  const key = tipKey(tip.name)
  const orgs = await db
    .select({ id: s.organization.id, name: s.organization.name, status: s.organization.status })
    .from(s.organization)
    .where(and(eq(s.organization.country, tip.country), ne(s.organization.status, 'rejected')))
  const known = orgs.find((o) => tipKey(o.name) === key)
  if (known?.status === 'verified') return { ok: false, error: 'exists', orgId: known.id, name: known.name }
  if (known) return { ok: true, message: 'pending', name: known.name }

  const entry = matchDirectory(tip.name, tip.country, tip.city)
  await db
    .insert(s.suggestion)
    .values({
      id: crypto.randomUUID(),
      kind: entry ? 'vote' : 'shelter',
      name: entry?.name ?? tip.name,
      country: tip.country,
      city: entry?.city ?? tip.city,
      website: entry?.website ?? website,
      directoryId: entry?.id ?? null,
      note: tip.note,
      suggestedBy: viewer.userId,
    })
    .onConflictDoNothing()
  revalidatePath('/shelters')
  return { ok: true, message: entry ? 'voted' : 'tipped', name: entry?.name ?? tip.name }
}

/** "I want to walk here" on a shelter from the directory. One vote per person per shelter. */
export async function voteForShelter(directoryId: string): Promise<{ ok: boolean; error?: string }> {
  const viewer = await actionViewer()
  const entry = directoryEntry(String(directoryId))
  if (!entry) return { ok: false, error: 'invalid' }
  if ((await tipsToday(viewer.userId)) >= MAX_TIPS_PER_DAY) return { ok: false, error: 'too-many' }
  const db = await getDb()
  await db
    .insert(s.suggestion)
    .values({
      id: crypto.randomUUID(),
      kind: 'vote',
      name: entry.name,
      country: entry.country,
      city: entry.city ?? '',
      website: entry.website,
      directoryId: entry.id,
      suggestedBy: viewer.userId,
    })
    .onConflictDoNothing()
  revalidatePath('/shelters')
  return { ok: true }
}

/** Admin: mark a group of tips about the same shelter as contacted, declined, duplicate or spam. */
export async function setTipStatus(ids: string[], status: string, note = ''): Promise<void> {
  const admin = await requireAdmin()
  const parsed = z
    .object({ ids: z.array(z.string().min(1).max(64)).min(1).max(500), status: z.enum(TIP_STATUSES), note: z.string().trim().max(600) })
    .safeParse({ ids, status, note })
  if (!parsed.success) return
  const db = await getDb()
  await db
    .update(s.suggestion)
    .set({ status: parsed.data.status, adminNote: parsed.data.note, handledBy: admin.userId, handledAt: new Date() })
    .where(inArray(s.suggestion.id, parsed.data.ids))
  await audit(db, admin.userId, `tip.${parsed.data.status}`, 'suggestion', parsed.data.ids[0], { count: parsed.data.ids.length })
  revalidatePath('/admin')
}
