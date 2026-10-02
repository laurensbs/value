'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isCountry } from '@/lib/countries'
import { PROVIDES } from '@/lib/dog-options'
import { fuzzLatLng, isValidLatLng } from '@/lib/geo'
import { isAllowedPhotoUrl } from '@/lib/photos'
import { audit } from '../notify'
import { actionViewer, isOrgMember } from '../session'
import type { FormState } from './profile'

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

  const db = await getDb()
  const id = String(form.get('id') || '')
  const [existing] = id ? await db.select().from(s.dog).where(eq(s.dog.id, id)) : []
  if (id && !existing) return { ok: false, error: 'forbidden' }
  // A shelter dog stays with its shelter: the form cannot move it to another one.
  const orgId = existing ? existing.orgId : String(form.get('orgId') || '') || null
  const staff = (o: string | null) => Boolean(o && (isOrgMember(viewer, o) || viewer.isAdmin))
  const allowed = existing ? existing.ownerId === viewer.userId || staff(existing.orgId) : !orgId || staff(orgId)
  if (!allowed) return { ok: false, error: 'forbidden' }

  const { slots, lat, lng, ...fields } = d
  let place: { country: string; city: string; lat: number | null; lng: number | null }
  if (orgId) {
    // Shelter dogs live at the shelter, never near the home of the staff member who adds them.
    const [org] = await db
      .select({ country: s.organization.country, city: s.organization.city, lat: s.organization.lat, lng: s.organization.lng })
      .from(s.organization)
      .where(eq(s.organization.id, orgId))
    if (!org) return { ok: false, error: 'forbidden' }
    place = org
  } else if (lat !== undefined && lng !== undefined && isValidLatLng(lat, lng)) {
    place = { country: d.country, city: d.city, ...fuzzLatLng({ lat, lng }) }
  } else {
    place = { country: d.country, city: d.city, lat: existing?.lat ?? viewer.profile.lat, lng: existing?.lng ?? viewer.profile.lng }
  }
  const values = {
    ...fields,
    // Only photos from our own upload, or ones the dog already had (e.g. from a shelter's CSV import).
    photos: fields.photos.filter((p) => isAllowedPhotoUrl(p) || existing?.photos.includes(p)),
    ...place,
    // A dog that ever bit someone is only for experienced walkers.
    level: d.biteHistory ? 'experienced' : d.level,
  }

  let dogId = id
  if (existing) {
    await db.update(s.dog).set(values).where(eq(s.dog.id, id))
    await db.delete(s.dogSlot).where(eq(s.dogSlot.dogId, id))
  } else {
    dogId = crypto.randomUUID()
    await db.insert(s.dog).values({ id: dogId, ...values, ownerId: orgId ? null : viewer.userId, orgId })
    if (!orgId) await db.update(s.profile).set({ hasDogs: true }).where(eq(s.profile.userId, viewer.userId))
  }
  if (slots.length > 0) {
    await db.insert(s.dogSlot).values(slots.map((slot) => ({ id: crypto.randomUUID(), dogId, ...slot })))
  }
  revalidatePath('/dogs')
  redirect(orgId ? `/shelter/${orgId}` : `/dogs/${dogId}?saved=1`)
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
  revalidatePath(`/dogs/${dog.id}`)
  if (dog.orgId) revalidatePath(`/shelter/${dog.orgId}`)
}

export async function deleteDog(dogId: string): Promise<void> {
  const viewer = await actionViewer()
  const db = await getDb()
  await db
    .delete(s.dog)
    .where(and(eq(s.dog.id, dogId), eq(s.dog.ownerId, viewer.userId)))
  redirect('/my-dogs')
}
