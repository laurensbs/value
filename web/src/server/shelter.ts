import 'server-only'
import { and, asc, desc, eq, gte, inArray } from 'drizzle-orm'
import type { OrgInitial } from '@/components/ShelterTools'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isCountry } from '@/lib/countries'
import { TREATS, type Treats } from '@/lib/dog-options'
import type { DraftDog } from '@/lib/draft-dogs'

export type Organization = typeof s.organization.$inferSelect

/** The shelter's saved details, in the shape the shelter forms use. */
export function orgInitial(org: Organization): OrgInitial {
  return {
    name: org.name,
    country: isCountry(org.country) ? org.country : 'NL',
    city: org.city,
    address: org.address,
    registrationNumber: org.registrationNumber,
    website: org.website ?? '',
    instagram: org.instagram ?? '',
    email: org.email ?? '',
    phone: org.phone ?? '',
    description: org.description,
    dogCount: org.dogCount,
    openingHours: org.openingHours,
    walkingTimes: org.walkingTimes,
    coordinatorName: org.coordinatorName,
    coordinatorEmail: org.coordinatorEmail ?? '',
    coordinatorPhone: org.coordinatorPhone ?? '',
    treatsPolicy: (TREATS as readonly string[]).includes(org.treatsPolicy) ? (org.treatsPolicy as Treats) : 'own',
    provides: org.provides,
    defaultWalkMinutes: org.defaultWalkMinutes,
    logoUrl: org.logoUrl ?? '',
    coverUrl: org.coverUrl ?? '',
    lat: org.lat,
    lng: org.lng,
  }
}

/** The shelter's draft dogs (photo-first bulk add), oldest first. */
export async function draftDogs(orgId: string): Promise<DraftDog[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(s.dog)
    .where(and(eq(s.dog.orgId, orgId), eq(s.dog.status, 'draft')))
    .orderBy(asc(s.dog.createdAt))
  return rows.map((d) => ({
    id: d.id,
    name: d.name,
    photo: d.photos[0] ?? '',
    sex: d.sex === 'male' ? 'male' : 'female',
    ageYears: d.ageYears,
    size: d.size === 'small' || d.size === 'large' ? d.size : 'medium',
    energy: d.energy === 'calm' || d.energy === 'high' ? d.energy : 'medium',
    level: d.level === 'experienced' ? 'experienced' : 'starter',
  }))
}

export async function shelterDashboard(orgId: string) {
  const db = await getDb()
  const [org] = await db.select().from(s.organization).where(eq(s.organization.id, orgId))
  if (!org) return null
  const dogs = await db.select().from(s.dog).where(eq(s.dog.orgId, orgId)).orderBy(desc(s.dog.createdAt))
  const walks = await db
    .select()
    .from(s.groupWalk)
    .where(and(eq(s.groupWalk.orgId, orgId), eq(s.groupWalk.status, 'scheduled'), gte(s.groupWalk.startsAt, new Date(Date.now() - 3 * 24 * 60 * 60_000))))
    .orderBy(asc(s.groupWalk.startsAt))
  const signups = walks.length
    ? await db
        .select({
          groupWalkId: s.groupWalkSignup.groupWalkId,
          userId: s.groupWalkSignup.userId,
          status: s.groupWalkSignup.status,
          firstName: s.profile.firstName,
          photoUrl: s.profile.photoUrl,
          phone: s.profile.phone,
          birthDate: s.profile.birthDate,
          experience: s.profile.experience,
        })
        .from(s.groupWalkSignup)
        .innerJoin(s.profile, eq(s.profile.userId, s.groupWalkSignup.userId))
        .where(inArray(s.groupWalkSignup.groupWalkId, walks.map((w) => w.id)))
    : []
  const checked = signups.length
    ? await db
        .select({ walkerId: s.idCheck.walkerId })
        .from(s.idCheck)
        .where(and(eq(s.idCheck.orgId, orgId), inArray(s.idCheck.walkerId, [...new Set(signups.map((x) => x.userId))])))
    : []
  const members = await db
    .select({ userId: s.organizationMember.userId, role: s.organizationMember.role, name: s.user.name, email: s.user.email })
    .from(s.organizationMember)
    .innerJoin(s.user, eq(s.user.id, s.organizationMember.userId))
    .where(eq(s.organizationMember.orgId, orgId))
  const idChecked = new Set(checked.map((c) => c.walkerId))
  return {
    org,
    dogs,
    walks: walks.map((w) => ({
      ...w,
      signups: signups
        .filter((x) => x.groupWalkId === w.id && x.status !== 'cancelled')
        .map((x) => ({ ...x, idChecked: idChecked.has(x.userId) })),
    })),
    members,
  }
}
