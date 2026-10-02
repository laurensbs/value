import 'server-only'
import { and, asc, desc, eq, gte, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'

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
