'use server'

import { and, count, eq, gte, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isCountry } from '@/lib/countries'
import { parseDogCsv } from '@/lib/dog-import'
import { MAX_DRAFT_DOGS, shelterDogDefaults } from '@/lib/dog-options'
import { draftRowSchema, type DraftDog } from '@/lib/draft-dogs'
import { fuzzLatLng, isValidLatLng } from '@/lib/geo'
import { normalizeInstagram, normalizeWebsite, readOrgForm, type OrgDetails } from '@/lib/org-fields'
import { isAllowedPhotoUrl } from '@/lib/photos'
import { isAdult } from '@/lib/rules'
import { zonedToUtc } from '@/lib/time'
import { audit, notify, notifyAdmins } from '../notify'
import { actionViewer, isOrgMember } from '../session'
import type { FormState } from './profile'

/** Maps the checked form to organization columns, or says which field is wrong. */
function orgColumns(d: OrgDetails) {
  const website = d.website ? normalizeWebsite(d.website) : null
  if (d.website && !website) return { error: 'website' as const }
  const instagram = d.instagram ? normalizeInstagram(d.instagram) : null
  if (d.instagram && !instagram) return { error: 'instagram' as const }
  const { lat, lng, logoUrl, coverUrl, coordinatorEmail, coordinatorPhone, dogCount, ...rest } = d
  // Only set when a shelter claims a directory entry at sign-up, never on later edits.
  delete rest.directoryId
  return {
    values: {
      ...rest,
      website,
      instagram,
      logoUrl: logoUrl || null,
      coverUrl: coverUrl || null,
      coordinatorEmail: coordinatorEmail || null,
      coordinatorPhone: coordinatorPhone || null,
      dogCount: dogCount ?? null,
      ...(lat !== undefined && lng !== undefined && isValidLatLng(lat, lng) ? { lat, lng } : {}),
    },
  }
}

export async function createOrganization(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await actionViewer()
  const parsed = readOrgForm(form)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  if (form.get('authorized') !== 'on') return { ok: false, error: 'authorized' }
  const mapped = orgColumns(parsed.data)
  if ('error' in mapped) return { ok: false, error: mapped.error }
  const db = await getDb()
  const id = crypto.randomUUID()
  await db.insert(s.organization).values({
    id,
    ...mapped.values,
    directoryId: parsed.data.directoryId ?? null,
    status: 'pending',
    createdBy: viewer.userId,
  })
  await db.insert(s.organizationMember).values({ orgId: id, userId: viewer.userId, role: 'admin' })
  await audit(db, viewer.userId, 'org.created', 'organization', id)
  await notifyAdmins(db, 'org-pending', { orgId: id, orgName: mapped.values.name })
  redirect(`/shelter/${id}?created=1`)
}

async function requireMember(orgId: string) {
  const viewer = await actionViewer()
  if (!isOrgMember(viewer, orgId) && !viewer.isAdmin) throw new Error('forbidden')
  return viewer
}

export async function updateOrganization(_prev: FormState, form: FormData): Promise<FormState> {
  const orgId = String(form.get('orgId') ?? '')
  const viewer = await requireMember(orgId)
  const db = await getDb()
  const [org] = await db.select().from(s.organization).where(eq(s.organization.id, orgId))
  if (!org) return { ok: false, error: 'forbidden' }
  const parsed = readOrgForm(form)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const mapped = orgColumns(parsed.data)
  if ('error' in mapped) return { ok: false, error: mapped.error }
  const values = { ...mapped.values }
  // A verified shelter's name, number and country were checked by hand; only an admin can change them.
  if (org.status === 'verified' && !viewer.isAdmin) {
    values.name = org.name
    values.registrationNumber = org.registrationNumber
    if (isCountry(org.country)) values.country = org.country
  }
  await db.update(s.organization).set(values).where(eq(s.organization.id, orgId))

  // Shelter dogs live at the shelter: keep their place in step with it.
  const place = { country: values.country, city: values.city, lat: values.lat ?? org.lat, lng: values.lng ?? org.lng }
  if (place.country !== org.country || place.city !== org.city || place.lat !== org.lat || place.lng !== org.lng) {
    await db.update(s.dog).set(place).where(eq(s.dog.orgId, orgId))
  }
  await audit(db, viewer.userId, 'org.updated', 'organization', orgId)
  revalidatePath(`/shelter/${orgId}`)
  revalidatePath('/shelters')
  return { ok: true, message: 'saved' }
}

export async function importDogs(_prev: FormState & { created?: number; errors?: { row: number; message: string }[] }, form: FormData) {
  const orgId = String(form.get('orgId') ?? '')
  const viewer = await requireMember(orgId)
  const db = await getDb()
  const [org] = await db.select().from(s.organization).where(eq(s.organization.id, orgId))
  if (!org) return { ok: false, error: 'forbidden' }

  const file = form.get('file')
  const text = file instanceof File && file.size > 0 ? await file.text() : String(form.get('csv') ?? '')
  if (text.length > 1_000_000) return { ok: false, error: 'too-large' }
  const defaults = shelterDogDefaults(org)
  const { dogs, errors } = parseDogCsv(text, defaults)
  if (dogs.length === 0) return { ok: false, error: 'no-rows', errors }

  await db.insert(s.dog).values(
    dogs.map((d) => ({
      id: crypto.randomUUID(),
      orgId,
      ...d,
      provides: defaults.provides,
      country: org.country,
      city: org.city,
      lat: org.lat,
      lng: org.lng,
      // The shelter accepted the partner terms, which cover insurance and health.
      insuranceConfirmed: true,
      healthConfirmed: true,
    })),
  )
  await audit(db, viewer.userId, 'org.import', 'organization', orgId, { created: dogs.length })
  revalidatePath(`/shelter/${orgId}`)
  return { ok: true, created: dogs.length, errors }
}

const groupWalkSchema = z.object({
  orgId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.coerce.number().int().min(15).max(240),
  capacity: z.coerce.number().int().min(1).max(30),
  level: z.enum(['starter', 'experienced']),
  meetingPoint: z.string().trim().min(2).max(200),
  notes: z.string().trim().max(600).default(''),
})

export async function createGroupWalk(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = groupWalkSchema.safeParse({
    orgId: form.get('orgId'),
    date: form.get('date'),
    time: form.get('time'),
    durationMin: form.get('durationMin'),
    capacity: form.get('capacity'),
    level: form.get('level'),
    meetingPoint: form.get('meetingPoint'),
    notes: form.get('notes') ?? '',
  })
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const g = parsed.data
  const viewer = await requireMember(g.orgId)
  const startsAt = zonedToUtc(g.date, g.time)
  if (startsAt.getTime() < Date.now()) return { ok: false, error: 'too-soon' }
  const db = await getDb()
  const id = crypto.randomUUID()
  await db.insert(s.groupWalk).values({
    id,
    orgId: g.orgId,
    startsAt,
    durationMin: g.durationMin,
    capacity: g.capacity,
    level: g.level,
    meetingPoint: g.meetingPoint,
    notes: g.notes,
    createdBy: viewer.userId,
  })
  await tellVoters(id, g.orgId)
  revalidatePath(`/shelter/${g.orgId}`)
  return { ok: true, message: 'created' }
}

/** People who asked for this shelter ("I want to walk here") hear about a new group walk, at most once a week. */
async function tellVoters(groupWalkId: string, orgId: string) {
  const db = await getDb()
  const [org] = await db
    .select({ name: s.organization.name, directoryId: s.organization.directoryId, status: s.organization.status })
    .from(s.organization)
    .where(eq(s.organization.id, orgId))
  if (!org?.directoryId || org.status !== 'verified') return
  const voters = await db
    .select({ id: s.suggestion.suggestedBy })
    .from(s.suggestion)
    .where(and(eq(s.suggestion.directoryId, org.directoryId), inArray(s.suggestion.status, ['new', 'contacted', 'joined'])))
  if (!voters.length) return
  const recent = await db
    .select({ userId: s.notification.userId })
    .from(s.notification)
    .where(
      and(
        eq(s.notification.kind, 'group-walk-new'),
        gte(s.notification.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60_000)),
        sql`${s.notification.data}->>'orgId' = ${orgId}`,
      ),
    )
  const told = new Set(recent.map((r) => r.userId))
  await notify(db, voters.map((v) => v.id).filter((id) => !told.has(id)), 'group-walk-new', { orgId, orgName: org.name, groupWalkId })
}

export async function cancelGroupWalk(groupWalkId: string): Promise<void> {
  const db = await getDb()
  const [gw] = await db.select().from(s.groupWalk).where(eq(s.groupWalk.id, groupWalkId))
  if (!gw) return
  await requireMember(gw.orgId)
  await db.update(s.groupWalk).set({ status: 'cancelled' }).where(eq(s.groupWalk.id, groupWalkId))
  const people = await db
    .select({ id: s.groupWalkSignup.userId })
    .from(s.groupWalkSignup)
    .where(eq(s.groupWalkSignup.groupWalkId, groupWalkId))
  await notify(db, people.map((p) => p.id), 'request-cancelled', { groupWalkId, dogName: '' })
  revalidatePath(`/shelter/${gw.orgId}`)
}

export async function joinGroupWalk(groupWalkId: string): Promise<FormState> {
  const viewer = await actionViewer()
  if (!isAdult(viewer.profile.birthDate)) return { ok: false, error: 'too-young' }
  const db = await getDb()
  const [gw] = await db
    .select({ walk: s.groupWalk, org: s.organization })
    .from(s.groupWalk)
    .innerJoin(s.organization, eq(s.organization.id, s.groupWalk.orgId))
    .where(eq(s.groupWalk.id, groupWalkId))
  if (!gw || gw.walk.status !== 'scheduled' || gw.org.status !== 'verified') return { ok: false, error: 'dog-unavailable' }
  if (gw.org.isDemo) return { ok: false, error: 'demo-dog' }
  if (gw.walk.level === 'experienced' && viewer.profile.experience === 'none') return { ok: false, error: 'experience' }

  const [{ n }] = await db
    .select({ n: count() })
    .from(s.groupWalkSignup)
    .where(and(eq(s.groupWalkSignup.groupWalkId, groupWalkId), inArray(s.groupWalkSignup.status, ['booked', 'attended'])))
  if (n >= gw.walk.capacity) return { ok: false, error: 'full' }

  await db
    .insert(s.groupWalkSignup)
    .values({ groupWalkId, userId: viewer.userId, status: 'booked' })
    .onConflictDoUpdate({ target: [s.groupWalkSignup.groupWalkId, s.groupWalkSignup.userId], set: { status: 'booked' } })
  const staff = await db
    .select({ id: s.organizationMember.userId })
    .from(s.organizationMember)
    .where(eq(s.organizationMember.orgId, gw.org.id))
  await notify(db, staff.map((m) => m.id), 'group-signup', { groupWalkId, walkerName: viewer.profile.firstName })
  revalidatePath('/group-walks')
  return { ok: true, message: 'joined' }
}

export async function leaveGroupWalk(groupWalkId: string): Promise<FormState> {
  const viewer = await actionViewer()
  const db = await getDb()
  await db
    .update(s.groupWalkSignup)
    .set({ status: 'cancelled' })
    .where(and(eq(s.groupWalkSignup.groupWalkId, groupWalkId), eq(s.groupWalkSignup.userId, viewer.userId)))
  revalidatePath('/group-walks')
  return { ok: true }
}

/** Staff mark who came, and that they saw the walker's ID in person (no copy is stored). */
export async function markAttendance(groupWalkId: string, userId: string, attended: boolean, idSeen: boolean): Promise<void> {
  const db = await getDb()
  const [gw] = await db.select().from(s.groupWalk).where(eq(s.groupWalk.id, groupWalkId))
  if (!gw) return
  const viewer = await requireMember(gw.orgId)
  await db
    .update(s.groupWalkSignup)
    .set({ status: attended ? 'attended' : 'no_show' })
    .where(and(eq(s.groupWalkSignup.groupWalkId, groupWalkId), eq(s.groupWalkSignup.userId, userId)))
  if (attended && idSeen) {
    await db
      .insert(s.idCheck)
      .values({ id: crypto.randomUUID(), walkerId: userId, checkedBy: viewer.userId, orgId: gw.orgId })
      .onConflictDoNothing()
  }
  revalidatePath(`/shelter/${gw.orgId}`)
}

export async function addStaff(_prev: FormState, form: FormData): Promise<FormState> {
  const orgId = String(form.get('orgId') ?? '')
  await requireMember(orgId)
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const db = await getDb()
  const [u] = await db.select({ id: s.user.id }).from(s.user).where(eq(s.user.email, email))
  if (!u) return { ok: false, error: 'no-account' }
  await db.insert(s.organizationMember).values({ orgId, userId: u.id, role: 'staff' }).onConflictDoNothing()
  revalidatePath(`/shelter/${orgId}`)
  return { ok: true, message: 'added' }
}

export async function updateOrgLocation(orgId: string, lat: number, lng: number): Promise<void> {
  await requireMember(orgId)
  if (!isValidLatLng(lat, lng)) return
  const db = await getDb()
  await db.update(s.organization).set(fuzzLatLng({ lat, lng })).where(eq(s.organization.id, orgId))
}

type DraftResult = { ok: true; dog: DraftDog } | { ok: false; error: string }

/** Photo-first bulk add: every uploaded photo becomes a draft dog right away, so nothing is lost on a bad connection. */
export async function createDraftDog(orgId: string, photoUrl: string, name: string): Promise<DraftResult> {
  await requireMember(orgId)
  if (typeof photoUrl !== 'string' || !isAllowedPhotoUrl(photoUrl)) return { ok: false, error: 'invalid' }
  const db = await getDb()
  const [org] = await db.select().from(s.organization).where(eq(s.organization.id, orgId))
  if (!org) return { ok: false, error: 'forbidden' }
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.dog)
    .where(and(eq(s.dog.orgId, orgId), eq(s.dog.status, 'draft')))
  if (n >= MAX_DRAFT_DOGS) return { ok: false, error: 'too-many-drafts' }

  const defaults = shelterDogDefaults(org)
  const dog: DraftDog = {
    id: crypto.randomUUID(),
    name: String(name ?? '').trim().slice(0, 60),
    photo: photoUrl,
    sex: 'female',
    ageYears: null,
    size: 'medium',
    energy: 'medium',
    level: 'starter',
  }
  await db.insert(s.dog).values({
    id: dog.id,
    orgId,
    name: dog.name,
    photos: [photoUrl],
    ...defaults,
    country: org.country,
    city: org.city,
    lat: org.lat,
    lng: org.lng,
    // The shelter accepted the partner terms, which cover insurance and health.
    insuranceConfirmed: true,
    healthConfirmed: true,
    status: 'draft',
  })
  return { ok: true, dog }
}

/** Saves the quick details of draft dogs; with publish, every draft with a name goes online. */
export async function saveDraftDogs(
  orgId: string,
  rows: unknown,
  publish: boolean,
): Promise<{ ok: boolean; published: number; missingName: number; error?: string }> {
  const viewer = await requireMember(orgId)
  const parsed = z.array(draftRowSchema).max(MAX_DRAFT_DOGS).safeParse(rows)
  if (!parsed.success) return { ok: false, published: 0, missingName: 0, error: 'invalid' }
  const db = await getDb()
  let published = 0
  let missingName = 0
  for (const row of parsed.data) {
    const goOnline = publish && row.name.length > 0
    if (publish && !goOnline) missingName++
    const updated = await db
      .update(s.dog)
      .set({
        name: row.name,
        sex: row.sex,
        ageYears: row.ageYears,
        size: row.size,
        energy: row.energy,
        level: row.level,
        ...(goOnline ? { status: 'active' } : {}),
      })
      .where(and(eq(s.dog.id, row.id), eq(s.dog.orgId, orgId), eq(s.dog.status, 'draft')))
      .returning({ id: s.dog.id })
    if (goOnline && updated.length) published++
  }
  if (published) {
    await audit(db, viewer.userId, 'org.dogs-published', 'organization', orgId, { published })
    revalidatePath('/dogs')
  }
  revalidatePath(`/shelter/${orgId}`)
  return { ok: true, published, missingName }
}

export async function deleteDraftDog(dogId: string): Promise<void> {
  const db = await getDb()
  const [dog] = await db.select({ orgId: s.dog.orgId, status: s.dog.status }).from(s.dog).where(eq(s.dog.id, String(dogId)))
  if (!dog?.orgId || dog.status !== 'draft') return
  await requireMember(dog.orgId)
  await db.delete(s.dog).where(and(eq(s.dog.id, String(dogId)), eq(s.dog.status, 'draft')))
}
