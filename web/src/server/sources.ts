import 'server-only'
import { and, eq, gte, inArray, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { cleanInviteCode } from '@/lib/invite'
import { adminEmails } from '@/lib/site'
import { weekStarts } from './launch-core'
import { SOURCE_WEEKS, sourcesReport } from './sources-core'

/** Example rows from the seed (src/db/seed.ts) have ids and e-mail addresses like these. */
const isDemoId = (id: string | null | undefined) => Boolean(id?.startsWith('demo-'))
const isDemoEmail = (email: string | null | undefined) => Boolean(email?.toLowerCase().endsWith('@demo.example.org'))

/**
 * Bronnen in Beheer: new sign-ups per source and role, and new real dogs, per ISO week for the last
 * eight weeks. Only counts and the admin's own campaign codes leave this function: never a name, an
 * e-mail address or a member's personal code. Example data (is_demo, ids "demo-…",
 * @demo.example.org) and the admins never count.
 */
export async function sourcesData(now = new Date()) {
  const db = await getDb()
  const since = weekStarts(now, SOURCE_WEEKS)[0]
  const owner = alias(s.user, 'dog_owner')

  const [signupRows, shelterRows, dogRows] = await Promise.all([
    db
      .select({
        id: s.profile.userId,
        at: s.profile.createdAt,
        referredBy: s.profile.referredBy,
        wantsToWalk: s.profile.wantsToWalk,
        hasDogs: s.profile.hasDogs,
        email: s.user.email,
        role: s.user.role,
      })
      .from(s.profile)
      .innerJoin(s.user, eq(s.user.id, s.profile.userId))
      .where(gte(s.profile.createdAt, since)),
    // Everyone at a real shelter (pending, verified or turned down: they signed up as a shelter).
    db
      .selectDistinct({ userId: s.organizationMember.userId })
      .from(s.organizationMember)
      .innerJoin(s.organization, eq(s.organization.id, s.organizationMember.orgId))
      .where(eq(s.organization.isDemo, false)),
    db
      .select({
        id: s.dog.id,
        at: s.dog.createdAt,
        isDemo: s.dog.isDemo,
        ownerId: s.dog.ownerId,
        orgId: s.dog.orgId,
        orgIsDemo: s.organization.isDemo,
        ownerEmail: owner.email,
        ownerRole: owner.role,
      })
      .from(s.dog)
      .leftJoin(s.organization, eq(s.organization.id, s.dog.orgId))
      .leftJoin(owner, eq(owner.id, s.dog.ownerId))
      .where(and(ne(s.dog.status, 'draft'), gte(s.dog.createdAt, since))),
  ])

  // Which codes are someone's own invite code: only the codes these sign-ups used are looked up.
  const used = [...new Set(signupRows.map((r) => cleanInviteCode(r.referredBy ?? '')).filter(Boolean))]
  const memberCodes = used.length
    ? new Set((await db.select({ code: s.profile.referralCode }).from(s.profile).where(inArray(s.profile.referralCode, used))).map((r) => r.code))
    : new Set<string>()

  const admins = new Set(adminEmails())
  const isAdmin = (email: string | null | undefined, role: string | null | undefined) => role === 'admin' || Boolean(email && admins.has(email.toLowerCase()))
  const shelterStaff = new Set(shelterRows.map((r) => r.userId))

  return sourcesReport(
    signupRows.map((r) => ({
      at: r.at,
      referredBy: r.referredBy,
      wantsToWalk: r.wantsToWalk,
      hasDogs: r.hasDogs,
      shelterMember: shelterStaff.has(r.id),
      demo: isDemoId(r.id) || isDemoEmail(r.email),
      admin: isAdmin(r.email, r.role),
    })),
    dogRows.map((d) => ({
      at: d.at,
      demo: d.isDemo || isDemoId(d.id) || isDemoId(d.ownerId) || isDemoId(d.orgId) || Boolean(d.orgIsDemo) || isDemoEmail(d.ownerEmail),
      admin: isAdmin(d.ownerEmail, d.ownerRole),
    })),
    memberCodes,
    now,
  )
}

export type SourcesData = Awaited<ReturnType<typeof sourcesData>>
