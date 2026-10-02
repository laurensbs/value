import 'server-only'
import { and, asc, count, desc, eq, gte, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { distanceM, type LatLng } from '@/lib/geo'
import type { DogFacts, Relation, TrustSignals, WalkerFacts } from '@/lib/rules'
import type { Viewer } from './session'

export type Dog = typeof s.dog.$inferSelect

export interface HostPublic {
  kind: 'owner' | 'shelter'
  id: string
  name: string
  photoUrl: string | null
  city: string
  verified: boolean
}

export interface DogListItem {
  dog: Dog
  host: HostPublic
  distanceM: number | null
}

export interface DogFilters {
  country?: string
  near?: LatLng | null
  energy?: string
  level?: string
  host?: 'owner' | 'shelter'
  orgId?: string
  q?: string
}

const PUBLIC_DOG_STATUSES = ['active']

export async function listDogs(filters: DogFilters, limit = 60): Promise<DogListItem[]> {
  const db = await getDb()
  const where = [inArray(s.dog.status, PUBLIC_DOG_STATUSES)]
  if (filters.country) where.push(eq(s.dog.country, filters.country))
  if (filters.energy) where.push(eq(s.dog.energy, filters.energy))
  if (filters.level) where.push(eq(s.dog.level, filters.level))
  if (filters.host === 'owner') where.push(isNull(s.dog.orgId))
  if (filters.host === 'shelter') where.push(sql`${s.dog.orgId} is not null`)
  if (filters.orgId) where.push(eq(s.dog.orgId, filters.orgId))
  if (filters.q) {
    const q = `%${filters.q.toLowerCase()}%`
    where.push(or(sql`lower(${s.dog.name}) like ${q}`, sql`lower(${s.dog.breed}) like ${q}`, sql`lower(${s.dog.city}) like ${q}`)!)
  }

  const rows = await db
    .select({
      dog: s.dog,
      ownerName: s.profile.firstName,
      ownerPhoto: s.profile.photoUrl,
      ownerCity: s.profile.city,
      orgName: s.organization.name,
      orgLogo: s.organization.logoUrl,
      orgCity: s.organization.city,
      orgStatus: s.organization.status,
    })
    .from(s.dog)
    .leftJoin(s.profile, eq(s.profile.userId, s.dog.ownerId))
    .leftJoin(s.organization, eq(s.organization.id, s.dog.orgId))
    .where(and(...where))
    .orderBy(desc(s.dog.createdAt))
    .limit(400)

  const items = rows
    // Shelter dogs are only public once the shelter is verified.
    .filter((r) => !r.dog.orgId || r.orgStatus === 'verified')
    .map((r): DogListItem => ({
      dog: r.dog,
      host: r.dog.orgId
        ? { kind: 'shelter', id: r.dog.orgId, name: r.orgName ?? '', photoUrl: r.orgLogo ?? null, city: r.orgCity ?? r.dog.city, verified: true }
        : { kind: 'owner', id: r.dog.ownerId ?? '', name: r.ownerName ?? '', photoUrl: r.ownerPhoto ?? null, city: r.ownerCity ?? r.dog.city, verified: false },
      distanceM:
        filters.near && r.dog.lat != null && r.dog.lng != null
          ? distanceM(filters.near, { lat: r.dog.lat, lng: r.dog.lng })
          : null,
    }))

  items.sort((a, b) => {
    if (a.dog.isDemo !== b.dog.isDemo) return a.dog.isDemo ? 1 : -1
    if (a.distanceM != null && b.distanceM != null) return a.distanceM - b.distanceM
    return 0
  })
  return items.slice(0, limit)
}

export async function trustSignals(userId: string): Promise<TrustSignals> {
  const db = await getDb()
  const [walks] = await db
    .select({ n: count() })
    .from(s.walk)
    .where(and(eq(s.walk.walkerId, userId), eq(s.walk.status, 'ended')))
  const [checks] = await db.select({ n: count() }).from(s.idCheck).where(eq(s.idCheck.walkerId, userId))
  const [p] = await db
    .select({ quiz: s.profile.quizPassedAt, created: s.profile.createdAt })
    .from(s.profile)
    .where(eq(s.profile.userId, userId))
  return {
    walks: walks.n,
    idChecks: checks.n,
    quizPassed: Boolean(p?.quiz),
    memberSinceYear: (p?.created ?? new Date()).getFullYear(),
  }
}

export async function walkerFacts(viewer: Viewer): Promise<WalkerFacts> {
  const db = await getDb()
  const [pending] = await db
    .select({ n: count() })
    .from(s.walkRequest)
    .where(and(eq(s.walkRequest.walkerId, viewer.userId), eq(s.walkRequest.status, 'pending')))
  const p = viewer.profile
  return {
    userId: viewer.userId,
    onboarded: Boolean(p),
    banned: Boolean(p?.bannedAt),
    birthDate: p?.birthDate ?? null,
    quizPassed: Boolean(p?.quizPassedAt),
    pppLicense: Boolean(p?.pppLicense),
    experience: (p?.experience as WalkerFacts['experience']) ?? 'none',
    pendingRequests: pending.n,
  }
}

export function dogFacts(dog: Dog): DogFacts {
  return {
    ownerId: dog.ownerId,
    orgId: dog.orgId,
    country: dog.country,
    status: dog.status,
    isDemo: dog.isDemo,
    ppp: dog.ppp,
    level: dog.level as DogFacts['level'],
  }
}

/** Is there a block in either direction between two people? */
export async function isBlocked(a: string, b: string | null): Promise<boolean> {
  if (!b) return false
  const db = await getDb()
  const rows = await db
    .select({ x: s.block.blockerId })
    .from(s.block)
    .where(or(and(eq(s.block.blockerId, a), eq(s.block.blockedId, b)), and(eq(s.block.blockerId, b), eq(s.block.blockedId, a))))
  return rows.length > 0
}

export async function relationFor(viewer: Viewer, dog: Dog): Promise<Relation & { hasAccepted: boolean; idSeen: boolean }> {
  const db = await getDb()
  const [grant] = await db
    .select()
    .from(s.trustGrant)
    .where(and(eq(s.trustGrant.dogId, dog.id), eq(s.trustGrant.walkerId, viewer.userId)))
  const accepted = await db
    .select({ id: s.walkRequest.id })
    .from(s.walkRequest)
    .where(
      and(
        eq(s.walkRequest.dogId, dog.id),
        eq(s.walkRequest.walkerId, viewer.userId),
        inArray(s.walkRequest.status, ['accepted', 'completed']),
      ),
    )
    .limit(1)
  return {
    isStaff: Boolean(dog.orgId && viewer.orgs.some((o) => o.id === dog.orgId)),
    blocked: await isBlocked(viewer.userId, dog.ownerId),
    soloAllowed: Boolean(grant?.soloAllowed),
    idSeen: Boolean(grant?.idSeen),
    hasAccepted: accepted.length > 0,
  }
}

export interface DogDetail {
  dog: Dog
  host: HostPublic & { bio?: string; phone?: string | null; email?: string | null; website?: string | null }
  slots: { weekday: number; time: string }[]
  groupWalks: { id: string; startsAt: Date; durationMin: number; capacity: number; booked: number; level: string; meetingPoint: string }[]
  /** The viewer may see meeting details, vet info and contact details. */
  canSeePrivate: boolean
  isMine: boolean
}

export async function getDogDetail(id: string, viewer: Viewer | null): Promise<DogDetail | null> {
  const db = await getDb()
  const [dog] = await db.select().from(s.dog).where(eq(s.dog.id, id))
  if (!dog) return null

  const isMine = Boolean(viewer && (dog.ownerId === viewer.userId || (dog.orgId && viewer.orgs.some((o) => o.id === dog.orgId))))
  let host: DogDetail['host']
  if (dog.orgId) {
    const [org] = await db.select().from(s.organization).where(eq(s.organization.id, dog.orgId))
    if (!org || (org.status !== 'verified' && !isMine && !viewer?.isAdmin)) return null
    host = {
      kind: 'shelter', id: org.id, name: org.name, photoUrl: org.logoUrl, city: org.city, verified: org.status === 'verified',
      bio: org.description, phone: org.phone, email: org.email, website: org.website,
    }
  } else {
    const [owner] = await db.select().from(s.profile).where(eq(s.profile.userId, dog.ownerId ?? ''))
    const [u] = await db.select({ email: s.user.email }).from(s.user).where(eq(s.user.id, dog.ownerId ?? ''))
    host = {
      kind: 'owner', id: dog.ownerId ?? '', name: owner?.firstName ?? '', photoUrl: owner?.photoUrl ?? null,
      city: owner?.city ?? dog.city, verified: false, bio: owner?.bio, phone: owner?.phone, email: u?.email,
    }
  }
  if (dog.status !== 'active' && !isMine && !viewer?.isAdmin) return null

  const slots = await db
    .select({ weekday: s.dogSlot.weekday, time: s.dogSlot.time })
    .from(s.dogSlot)
    .where(eq(s.dogSlot.dogId, dog.id))
    .orderBy(asc(s.dogSlot.weekday), asc(s.dogSlot.time))

  const groupWalks = dog.orgId ? await upcomingGroupWalks({ orgId: dog.orgId }) : []

  let canSeePrivate = isMine || Boolean(viewer?.isAdmin)
  if (!canSeePrivate && viewer) canSeePrivate = (await relationFor(viewer, dog)).hasAccepted

  if (!canSeePrivate) {
    dog.meetingInfo = ''
    dog.vetInfo = ''
    dog.chipNumber = ''
    host.phone = null
    host.email = null
  }
  return { dog, host, slots, groupWalks, canSeePrivate, isMine }
}

export async function upcomingGroupWalks(filter: { orgId?: string; country?: string }) {
  const db = await getDb()
  const where = [eq(s.groupWalk.status, 'scheduled'), gte(s.groupWalk.startsAt, new Date(Date.now() - 60 * 60_000))]
  if (filter.orgId) where.push(eq(s.groupWalk.orgId, filter.orgId))
  if (filter.country) where.push(eq(s.organization.country, filter.country))
  const rows = await db
    .select({
      id: s.groupWalk.id,
      orgId: s.groupWalk.orgId,
      orgName: s.organization.name,
      city: s.organization.city,
      startsAt: s.groupWalk.startsAt,
      durationMin: s.groupWalk.durationMin,
      capacity: s.groupWalk.capacity,
      level: s.groupWalk.level,
      meetingPoint: s.groupWalk.meetingPoint,
      notes: s.groupWalk.notes,
      isDemo: s.organization.isDemo,
      booked: sql<number>`(select count(*) from ${s.groupWalkSignup} where ${s.groupWalkSignup.groupWalkId} = ${s.groupWalk.id} and ${s.groupWalkSignup.status} in ('booked','attended'))`.mapWith(Number),
    })
    .from(s.groupWalk)
    .innerJoin(s.organization, eq(s.organization.id, s.groupWalk.orgId))
    .where(and(...where, eq(s.organization.status, 'verified')))
    .orderBy(asc(s.groupWalk.startsAt))
    .limit(50)
  return rows
}

export async function myGroupSignups(userId: string): Promise<Set<string>> {
  const db = await getDb()
  const rows = await db
    .select({ id: s.groupWalkSignup.groupWalkId })
    .from(s.groupWalkSignup)
    .where(and(eq(s.groupWalkSignup.userId, userId), eq(s.groupWalkSignup.status, 'booked')))
  return new Set(rows.map((r) => r.id))
}

export interface RequestRow {
  request: typeof s.walkRequest.$inferSelect
  dog: Pick<Dog, 'id' | 'name' | 'photos' | 'avatar' | 'city' | 'orgId' | 'ownerId' | 'meetingInfo' | 'walkMinutes' | 'isDemo'>
  walker: {
    id: string
    firstName: string
    photoUrl: string | null
    bio: string
    experience: string
    birthDate: string
    city: string
    phone: string | null
    email: string
  }
  walkId: string | null
  walkStatus: string | null
}

async function requestRows(where: ReturnType<typeof and>): Promise<RequestRow[]> {
  const db = await getDb()
  const rows = await db
    .select({
      request: s.walkRequest,
      dog: {
        id: s.dog.id, name: s.dog.name, photos: s.dog.photos, avatar: s.dog.avatar, city: s.dog.city, orgId: s.dog.orgId,
        ownerId: s.dog.ownerId, meetingInfo: s.dog.meetingInfo, walkMinutes: s.dog.walkMinutes, isDemo: s.dog.isDemo,
      },
      walker: {
        id: s.profile.userId, firstName: s.profile.firstName, photoUrl: s.profile.photoUrl, bio: s.profile.bio,
        experience: s.profile.experience, birthDate: s.profile.birthDate, city: s.profile.city, phone: s.profile.phone,
        email: s.user.email,
      },
    })
    .from(s.walkRequest)
    .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId))
    .innerJoin(s.profile, eq(s.profile.userId, s.walkRequest.walkerId))
    .innerJoin(s.user, eq(s.user.id, s.walkRequest.walkerId))
    .where(where)
    .orderBy(asc(s.walkRequest.startsAt))
    .limit(100)
  const ids = rows.map((r) => r.request.id)
  const walks = ids.length
    ? await db
        .select({ id: s.walk.id, requestId: s.walk.requestId, status: s.walk.status })
        .from(s.walk)
        .where(inArray(s.walk.requestId, ids))
        .orderBy(desc(s.walk.startedAt))
    : []
  return rows.map((r) => {
    const w = walks.find((x) => x.requestId === r.request.id)
    return { ...r, walkId: w?.id ?? null, walkStatus: w?.status ?? null }
  })
}

export async function outgoingRequests(userId: string): Promise<RequestRow[]> {
  return requestRows(and(eq(s.walkRequest.walkerId, userId), ne(s.walkRequest.status, 'cancelled')))
}

export async function incomingRequests(viewer: Viewer): Promise<RequestRow[]> {
  const orgIds = viewer.orgs.map((o) => o.id)
  const ownership = orgIds.length
    ? or(eq(s.dog.ownerId, viewer.userId), inArray(s.dog.orgId, orgIds))
    : eq(s.dog.ownerId, viewer.userId)
  return requestRows(and(ownership, ne(s.walkRequest.status, 'cancelled')))
}

export async function myDogs(viewer: Viewer): Promise<Dog[]> {
  const db = await getDb()
  return db.select().from(s.dog).where(eq(s.dog.ownerId, viewer.userId)).orderBy(asc(s.dog.createdAt))
}

export async function unreadCount(userId: string): Promise<number> {
  const db = await getDb()
  const [r] = await db
    .select({ n: count() })
    .from(s.notification)
    .where(and(eq(s.notification.userId, userId), isNull(s.notification.readAt)))
  return r.n
}

export async function notificationsFor(userId: string) {
  const db = await getDb()
  return db
    .select()
    .from(s.notification)
    .where(eq(s.notification.userId, userId))
    .orderBy(desc(s.notification.createdAt))
    .limit(50)
}

export interface HostContact {
  kind: 'owner' | 'shelter'
  name: string
  phone: string | null
  email: string | null
}

/** Contact details of the people behind these dogs. Only call this for accepted appointments. */
export async function hostContacts(dogs: { id: string; ownerId: string | null; orgId: string | null }[]): Promise<Map<string, HostContact>> {
  const result = new Map<string, HostContact>()
  if (dogs.length === 0) return result
  const db = await getDb()
  const ownerIds = [...new Set(dogs.map((d) => d.ownerId).filter((x): x is string => Boolean(x)))]
  const orgIds = [...new Set(dogs.map((d) => d.orgId).filter((x): x is string => Boolean(x)))]
  const owners = ownerIds.length
    ? await db
        .select({ id: s.profile.userId, name: s.profile.firstName, phone: s.profile.phone, email: s.user.email })
        .from(s.profile)
        .innerJoin(s.user, eq(s.user.id, s.profile.userId))
        .where(inArray(s.profile.userId, ownerIds))
    : []
  const orgs = orgIds.length
    ? await db
        .select({ id: s.organization.id, name: s.organization.name, phone: s.organization.phone, email: s.organization.email })
        .from(s.organization)
        .where(inArray(s.organization.id, orgIds))
    : []
  for (const dog of dogs) {
    const owner = owners.find((o) => o.id === dog.ownerId)
    const org = orgs.find((o) => o.id === dog.orgId)
    if (owner) result.set(dog.id, { kind: 'owner', name: owner.name, phone: owner.phone, email: owner.email })
    else if (org) result.set(dog.id, { kind: 'shelter', name: org.name, phone: org.phone || null, email: org.email || null })
  }
  return result
}

/** Existing trust grants, keyed "dogId:walkerId". */
export async function trustGrantsFor(dogIds: string[]): Promise<Map<string, { idSeen: boolean; soloAllowed: boolean }>> {
  const result = new Map<string, { idSeen: boolean; soloAllowed: boolean }>()
  if (dogIds.length === 0) return result
  const db = await getDb()
  const rows = await db.select().from(s.trustGrant).where(inArray(s.trustGrant.dogId, dogIds))
  for (const r of rows) result.set(`${r.dogId}:${r.walkerId}`, { idSeen: r.idSeen, soloAllowed: r.soloAllowed })
  return result
}
