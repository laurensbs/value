'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isCountry } from '@/lib/countries'
import { fuzzLatLng, isValidLatLng } from '@/lib/geo'
import { audit } from '../notify'
import { actionViewer, isOrgMember } from '../session'
import type { FormState } from './profile'

const PROVIDES = ['bags', 'leash', 'harness', 'treats', 'water', 'towel'] as const

const dogSchema = z.object({
  name: z.string().trim().min(1).max(60),
  breed: z.string().trim().max(80).default(''),
  sex: z.enum(['male', 'female']),
  ageYears: z.coerce.number().int().min(0).max(30).optional(),
  size: z.enum(['small', 'medium', 'large']),
  energy: z.enum(['calm', 'medium', 'high']),
  level: z.enum(['starter', 'experienced']),
  ppp: z.boolean(),
  story: z.string().trim().max(1500).default(''),
  needs: z.string().trim().max(600).default(''),
  traits: z.array(z.string().trim().min(1).max(40)).max(8),
  treats: z.enum(['yes', 'no', 'own']),
  treatsNote: z.string().trim().max(200).default(''),
  provides: z.array(z.enum(PROVIDES)),
  offLeash: z.boolean(),
  walkMinutes: z.coerce.number().int().min(10).max(180),
  country: z.string().refine(isCountry),
  city: z.string().trim().min(1).max(60),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  meetingInfo: z.string().trim().max(600).default(''),
  vetInfo: z.string().trim().max(300).default(''),
  chipNumber: z.string().trim().max(30).default(''),
  insuranceConfirmed: z.boolean(),
  healthConfirmed: z.boolean(),
  biteHistory: z.boolean(),
  biteNote: z.string().trim().max(600).default(''),
  photos: z.array(z.string().max(600_000)).max(6),
  slots: z.array(z.object({ weekday: z.number().int().min(1).max(7), time: z.string().regex(/^\d{2}:\d{2}$/) })).max(21),
})

function parseJsonArray(value: FormDataEntryValue | null): unknown[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveDog(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await actionViewer()
  const parsed = dogSchema.safeParse({
    name: form.get('name'),
    breed: form.get('breed') ?? '',
    sex: form.get('sex'),
    ageYears: form.get('ageYears') || undefined,
    size: form.get('size'),
    energy: form.get('energy'),
    level: form.get('level'),
    ppp: form.get('ppp') === 'on',
    story: form.get('story') ?? '',
    needs: form.get('needs') ?? '',
    traits: String(form.get('traits') ?? '')
      .split(/[\n,;]/)
      .map((t) => t.trim())
      .filter(Boolean),
    treats: form.get('treats'),
    treatsNote: form.get('treatsNote') ?? '',
    provides: form.getAll('provides'),
    offLeash: form.get('offLeash') === 'on',
    walkMinutes: form.get('walkMinutes'),
    country: form.get('country'),
    city: form.get('city'),
    lat: form.get('lat') || undefined,
    lng: form.get('lng') || undefined,
    meetingInfo: form.get('meetingInfo') ?? '',
    vetInfo: form.get('vetInfo') ?? '',
    chipNumber: form.get('chipNumber') ?? '',
    insuranceConfirmed: form.get('insuranceConfirmed') === 'on',
    healthConfirmed: form.get('healthConfirmed') === 'on',
    biteHistory: form.get('biteHistory') === 'on',
    biteNote: form.get('biteNote') ?? '',
    photos: parseJsonArray(form.get('photos')),
    slots: parseJsonArray(form.get('slots')),
  })
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const d = parsed.data
  if (!d.insuranceConfirmed || !d.healthConfirmed) return { ok: false, error: 'confirmations' }
  if (d.biteHistory && d.biteNote.length < 5) return { ok: false, error: 'bite-note' }

  const orgId = String(form.get('orgId') || '') || null
  if (orgId && !isOrgMember(viewer, orgId)) return { ok: false, error: 'forbidden' }

  const { slots, lat, lng, ...fields } = d
  const values = {
    ...fields,
    // A dog that ever bit someone is only for experienced walkers.
    level: d.biteHistory ? 'experienced' : d.level,
    ...(lat !== undefined && lng !== undefined && isValidLatLng(lat, lng) ? fuzzLatLng({ lat, lng }) : {}),
  }

  const db = await getDb()
  const id = String(form.get('id') || '')
  let dogId = id
  if (id) {
    const [existing] = await db.select().from(s.dog).where(eq(s.dog.id, id))
    const allowed = existing && (existing.ownerId === viewer.userId || isOrgMember(viewer, existing.orgId))
    if (!allowed) return { ok: false, error: 'forbidden' }
    await db.update(s.dog).set(values).where(eq(s.dog.id, id))
    await db.delete(s.dogSlot).where(eq(s.dogSlot.dogId, id))
  } else {
    dogId = crypto.randomUUID()
    await db.insert(s.dog).values({
      id: dogId,
      ...values,
      ownerId: orgId ? null : viewer.userId,
      orgId,
      lat: values.lat ?? viewer.profile.lat,
      lng: values.lng ?? viewer.profile.lng,
    })
    if (!orgId) await db.update(s.profile).set({ hasDogs: true }).where(eq(s.profile.userId, viewer.userId))
  }
  if (slots.length > 0) {
    await db.insert(s.dogSlot).values(slots.map((slot) => ({ id: crypto.randomUUID(), dogId, ...slot })))
  }
  revalidatePath('/dogs')
  redirect(orgId ? `/shelter/${orgId}` : `/dogs/${dogId}?saved=1`)
}

export async function setDogStatus(dogId: string, status: 'active' | 'paused' | 'adopted'): Promise<void> {
  const viewer = await actionViewer()
  const db = await getDb()
  const [dog] = await db.select().from(s.dog).where(eq(s.dog.id, dogId))
  if (!dog || !(dog.ownerId === viewer.userId || isOrgMember(viewer, dog.orgId) || viewer.isAdmin)) return
  await db.update(s.dog).set({ status }).where(eq(s.dog.id, dogId))
  await audit(db, viewer.userId, `dog.${status}`, 'dog', dogId)
  revalidatePath(`/dogs/${dogId}`)
}

export async function deleteDog(dogId: string): Promise<void> {
  const viewer = await actionViewer()
  const db = await getDb()
  await db
    .delete(s.dog)
    .where(and(eq(s.dog.id, dogId), eq(s.dog.ownerId, viewer.userId)))
  redirect('/my-dogs')
}
