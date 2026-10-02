'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { removeDemoData } from '@/db/seed'
import { tipKey } from '@/lib/tips'
import { audit, notify } from '../notify'
import { requireAdmin } from '../session'

export async function resolveReport(reportId: string, resolution: string): Promise<void> {
  const admin = await requireAdmin()
  const db = await getDb()
  await db
    .update(s.report)
    .set({ status: 'closed', resolution: resolution.slice(0, 1000), resolvedBy: admin.userId, resolvedAt: new Date() })
    .where(eq(s.report.id, reportId))
  await audit(db, admin.userId, 'report.closed', 'report', reportId, { resolution })
  revalidatePath('/admin')
}

/** Bans stop all activity immediately; the person is told why (DSA statement of reasons). */
export async function banUser(userId: string, reason: string): Promise<void> {
  const admin = await requireAdmin()
  const db = await getDb()
  await db.update(s.profile).set({ bannedAt: new Date(), banReason: reason.slice(0, 500) }).where(eq(s.profile.userId, userId))
  await db.update(s.walkRequest).set({ status: 'cancelled' }).where(eq(s.walkRequest.walkerId, userId))
  await db.update(s.dog).set({ status: 'hidden' }).where(eq(s.dog.ownerId, userId))
  await db.delete(s.session).where(eq(s.session.userId, userId))
  await audit(db, admin.userId, 'user.banned', 'user', userId, { reason })
  revalidatePath('/admin')
}

export async function unbanUser(userId: string): Promise<void> {
  const admin = await requireAdmin()
  const db = await getDb()
  await db.update(s.profile).set({ bannedAt: null, banReason: null }).where(eq(s.profile.userId, userId))
  await audit(db, admin.userId, 'user.unbanned', 'user', userId)
  revalidatePath('/admin')
}

export async function setOrganizationStatus(orgId: string, status: 'verified' | 'rejected' | 'pending'): Promise<void> {
  const admin = await requireAdmin()
  const db = await getDb()
  await db.update(s.organization).set({ status }).where(eq(s.organization.id, orgId))
  if (status === 'verified') {
    const members = await db
      .select({ id: s.organizationMember.userId })
      .from(s.organizationMember)
      .where(eq(s.organizationMember.orgId, orgId))
    await notify(db, members.map((m) => m.id), 'org-verified', { orgId })

    // Everyone who tipped or voted for this shelter hears that it joined.
    const [org] = await db
      .select({ name: s.organization.name, country: s.organization.country, directoryId: s.organization.directoryId })
      .from(s.organization)
      .where(eq(s.organization.id, orgId))
    if (org) {
      const open = await db
        .select({ id: s.suggestion.id, by: s.suggestion.suggestedBy, name: s.suggestion.name, directoryId: s.suggestion.directoryId })
        .from(s.suggestion)
        .where(and(eq(s.suggestion.country, org.country), inArray(s.suggestion.status, ['new', 'contacted'])))
      const key = tipKey(org.name)
      const hits = open.filter((tip) => (org.directoryId && tip.directoryId === org.directoryId) || tipKey(tip.name) === key)
      if (hits.length) {
        await db
          .update(s.suggestion)
          .set({ status: 'joined', handledBy: admin.userId, handledAt: new Date() })
          .where(inArray(s.suggestion.id, hits.map((tip) => tip.id)))
        await notify(db, hits.map((tip) => tip.by), 'shelter-joined', { orgId, orgName: org.name })
      }
    }
  }
  await audit(db, admin.userId, `org.${status}`, 'organization', orgId)
  revalidatePath('/admin')
}

export async function hideDog(dogId: string): Promise<void> {
  const admin = await requireAdmin()
  const db = await getDb()
  await db.update(s.dog).set({ status: 'hidden' }).where(eq(s.dog.id, dogId))
  await audit(db, admin.userId, 'dog.hidden', 'dog', dogId)
  revalidatePath('/admin')
}

export async function deleteDemoContent(): Promise<void> {
  const admin = await requireAdmin()
  const db = await getDb()
  await removeDemoData(db)
  await audit(db, admin.userId, 'demo.removed', 'system', 'demo')
  revalidatePath('/')
}

export async function makeAdmin(userId: string): Promise<void> {
  const admin = await requireAdmin()
  const db = await getDb()
  await db.update(s.user).set({ role: 'admin' }).where(eq(s.user.id, userId))
  await audit(db, admin.userId, 'user.admin', 'user', userId)
  revalidatePath('/admin')
}
