'use server'

import { and, count, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isCountry } from '@/lib/countries'
import { parseDogCsv } from '@/lib/dog-import'
import { fuzzLatLng, isValidLatLng } from '@/lib/geo'
import { isAdult } from '@/lib/rules'
import { zonedToUtc } from '@/lib/time'
import { audit, notify } from '../notify'
import { actionViewer, isOrgMember } from '../session'
import type { FormState } from './profile'

const orgSchema = z.object({
  name: z.string().trim().min(2).max(120),
  country: z.string().refine(isCountry),
  city: z.string().trim().min(1).max(60),
  address: z.string().trim().max(200).default(''),
  registrationNumber: z.string().trim().min(4).max(40),
  website: z.string().trim().max(200).default(''),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).default(''),
  description: z.string().trim().max(1500).default(''),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  directoryId: z.string().max(80).optional(),
})

export async function createOrganization(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await actionViewer()
  const parsed = orgSchema.safeParse({
    name: form.get('name'),
    country: form.get('country'),
    city: form.get('city'),
    address: form.get('address') ?? '',
    registrationNumber: form.get('registrationNumber'),
    website: form.get('website') ?? '',
    email: form.get('email'),
    phone: form.get('phone') ?? '',
    description: form.get('description') ?? '',
    lat: form.get('lat') || undefined,
    lng: form.get('lng') || undefined,
    directoryId: (form.get('directoryId') as string) || undefined,
  })
  if (!parsed.success) return { ok: false, error: 'invalid' }
  if (form.get('authorized') !== 'on') return { ok: false, error: 'authorized' }
  const { lat, lng, website, ...o } = parsed.data
  const db = await getDb()
  const id = crypto.randomUUID()
  await db.insert(s.organization).values({
    id,
    ...o,
    website: website ? (website.startsWith('http') ? website : `https://${website}`) : null,
    ...(lat !== undefined && lng !== undefined && isValidLatLng(lat, lng) ? { lat, lng } : {}),
    status: 'pending',
    createdBy: viewer.userId,
  })
  await db.insert(s.organizationMember).values({ orgId: id, userId: viewer.userId, role: 'admin' })
  await audit(db, viewer.userId, 'org.created', 'organization', id)
  redirect(`/shelter/${id}?created=1`)
}

async function requireMember(orgId: string) {
  const viewer = await actionViewer()
  if (!isOrgMember(viewer, orgId) && !viewer.isAdmin) throw new Error('forbidden')
  return viewer
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
  const { dogs, errors } = parseDogCsv(text)
  if (dogs.length === 0) return { ok: false, error: 'no-rows', errors }

  await db.insert(s.dog).values(
    dogs.map((d) => ({
      id: crypto.randomUUID(),
      orgId,
      ...d,
      provides: ['bags', 'leash'],
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
  revalidatePath(`/shelter/${g.orgId}`)
  return { ok: true, message: 'created' }
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
