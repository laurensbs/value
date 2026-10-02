import 'server-only'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { auth } from '@/lib/auth'
import { adminEmails } from '@/lib/site'

export type Profile = typeof s.profile.$inferSelect

export interface OrgMembership {
  id: string
  name: string
  status: string
  role: string
  country: string
}

export interface Viewer {
  userId: string
  email: string
  name: string
  image: string | null
  isAdmin: boolean
  profile: Profile | null
  orgs: OrgMembership[]
}

export type OnboardedViewer = Viewer & { profile: Profile }

export const getSession = cache(async () => {
  await getDb()
  return auth.api.getSession({ headers: await headers() })
})

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await getSession()
  if (!session) return null
  const db = await getDb()
  const [profile] = await db.select().from(s.profile).where(eq(s.profile.userId, session.user.id))
  const orgs = await db
    .select({
      id: s.organization.id,
      name: s.organization.name,
      status: s.organization.status,
      role: s.organizationMember.role,
      country: s.organization.country,
    })
    .from(s.organizationMember)
    .innerJoin(s.organization, eq(s.organization.id, s.organizationMember.orgId))
    .where(eq(s.organizationMember.userId, session.user.id))
  const role = (session.user as { role?: string }).role
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image ?? null,
    isAdmin: role === 'admin' || adminEmails().includes(session.user.email.toLowerCase()),
    profile: profile ?? null,
    orgs,
  }
})

export async function requireViewer(next = '/dogs'): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`)
  return viewer
}

export async function requireOnboarded(next = '/dogs'): Promise<OnboardedViewer> {
  const viewer = await requireViewer(next)
  if (!viewer.profile) redirect(`/onboarding?next=${encodeURIComponent(next)}`)
  if (viewer.profile.bannedAt) redirect('/banned')
  return viewer as OnboardedViewer
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer('/admin')
  if (!viewer.isAdmin) redirect('/')
  return viewer
}

/** For server actions: returns the viewer or throws (actions cannot redirect to login mid-form). */
export async function actionViewer(): Promise<OnboardedViewer> {
  const viewer = await getViewer()
  if (!viewer?.profile) throw new Error('not-signed-in')
  if (viewer.profile.bannedAt) throw new Error('banned')
  return viewer as OnboardedViewer
}

export function isOrgMember(viewer: Viewer, orgId: string | null | undefined): boolean {
  return Boolean(orgId && viewer.orgs.some((o) => o.id === orgId))
}
