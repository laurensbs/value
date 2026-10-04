import 'server-only'
import { cache } from 'react'
import { and, asc, between, count, desc, eq, gte, inArray, isNull, like, ne, not, notLike, or, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { citySlug } from '@/lib/cities'
import { distanceM, type LatLng } from '@/lib/geo'
import { NEAR_KM, nearness } from '@/lib/nearby'
import { NUDGE_KINDS } from '@/lib/nudges'
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

/**
 * How many people who want to walk live near a place (lib/nearby.ts), not counting `except`. Only
 * a number: who they are stays private until they ask about a dog themselves.
 */
export async function walkersNear(place: { country: string; city: string; lat: number | null; lng: number | null }, except: string): Promise<number> {
  const db = await getDb()
  const sameTown = sql`lower(trim(${s.profile.city})) = ${place.city.trim().toLowerCase()}`
  let where = sameTown
  if (place.lat != null && place.lng != null) {
    // A box around the place for the database; the exact distance is checked below.
    const dLat = NEAR_KM / 110.5
    const dLng = NEAR_KM / (111.3 * Math.cos((place.lat * Math.PI) / 180))
    where = or(
      and(between(s.profile.lat, place.lat - dLat, place.lat + dLat), between(s.profile.lng, place.lng - dLng, place.lng + dLng)),
      and(isNull(s.profile.lat), sameTown),
    )!
  }
  const rows = await db
    .select({ city: s.profile.city, lat: s.profile.lat, lng: s.profile.lng })
    .from(s.profile)
    .where(and(eq(s.profile.country, place.country), eq(s.profile.wantsToWalk, true), isNull(s.profile.bannedAt), ne(s.profile.userId, except), where))
  const here = { ...place, town: citySlug(place.city) }
  return rows.filter((r) => nearness(here, { country: place.country, town: citySlug(r.city), lat: r.lat, lng: r.lng }) != null).length
}

export async function trustSignals(userId: string): Promise<TrustSignals> {
  const db = await getDb()
  const [[walks], [checks], [p]] = await Promise.all([
    db
      .select({ n: count() })
      .from(s.walk)
      .where(and(eq(s.walk.walkerId, userId), eq(s.walk.status, 'ended'))),
    db.select({ n: count() }).from(s.idCheck).where(eq(s.idCheck.walkerId, userId)),
    db
      .select({ quiz: s.profile.quizPassedAt, created: s.profile.createdAt })
      .from(s.profile)
      .where(eq(s.profile.userId, userId)),
  ])
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

/** Everyone who blocked this person or was blocked by them. */
export async function blockedPeers(userId: string): Promise<Set<string>> {
  const db = await getDb()
  const rows = await db
    .select({ blocker: s.block.blockerId, blocked: s.block.blockedId })
    .from(s.block)
    .where(or(eq(s.block.blockerId, userId), eq(s.block.blockedId, userId)))
  return new Set(rows.map((r) => (r.blocker === userId ? r.blocked : r.blocker)))
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

export type DogRelation = Relation & { hasAccepted: boolean; idSeen: boolean }

export async function relationFor(viewer: Viewer, dog: Dog): Promise<DogRelation> {
  const db = await getDb()
  const [[grant], accepted, blocked] = await Promise.all([
    db
      .select()
      .from(s.trustGrant)
      .where(and(eq(s.trustGrant.dogId, dog.id), eq(s.trustGrant.walkerId, viewer.userId))),
    db
      .select({ id: s.walkRequest.id })
      .from(s.walkRequest)
      .where(
        and(
          eq(s.walkRequest.dogId, dog.id),
          eq(s.walkRequest.walkerId, viewer.userId),
          inArray(s.walkRequest.status, ['accepted', 'completed']),
          // The meeting place and vet details are for meeting in person; a first call shows the
          // phone number on the appointment itself (hostContacts), not the address.
          inArray(s.walkRequest.meetVia, ['walk', 'home']),
        ),
      )
      .limit(1),
    isBlocked(viewer.userId, dog.ownerId),
  ])
  return {
    isStaff: Boolean(dog.orgId && viewer.orgs.some((o) => o.id === dog.orgId)),
    blocked,
    soloAllowed: Boolean(grant?.soloAllowed),
    idSeen: Boolean(grant?.idSeen),
    hasAccepted: accepted.length > 0,
  }
}

export interface DogDetail {
  dog: Dog
  host: HostPublic & {
    bio?: string
    phone?: string | null
    email?: string | null
    website?: string | null
    instagram?: string | null
    walkingTimes?: string
  }
  slots: { weekday: number; time: string }[]
  groupWalks: { id: string; startsAt: Date; durationMin: number; capacity: number; booked: number; level: string; meetingPoint: string }[]
  /** The viewer may see meeting details, vet info and contact details. */
  canSeePrivate: boolean
  isMine: boolean
  /** How the signed-in viewer relates to this dog (null when signed out). */
  relation: DogRelation | null
}

/** One dog row, asked once per page load: the page and its link preview both need it. Never change it. */
const dogRow = cache(async (id: string): Promise<Dog | null> => {
  const db = await getDb()
  const [dog] = await db.select().from(s.dog).where(eq(s.dog.id, id))
  return dog ?? null
})

export async function getDogDetail(id: string, viewer: Viewer | null): Promise<DogDetail | null> {
  const row = await dogRow(id)
  if (!row) return null
  // A copy: private fields are emptied below for viewers who may not see them.
  const dog = { ...row }
  const db = await getDb()

  // Everything else only needs the dog, so it is asked all at once.
  const [org, owner, slots, groupWalks, relation] = await Promise.all([
    dog.orgId ? db.select().from(s.organization).where(eq(s.organization.id, dog.orgId)).then(([o]) => o) : undefined,
    dog.orgId
      ? undefined
      : db
          .select({ profile: s.profile, email: s.user.email })
          .from(s.user)
          .leftJoin(s.profile, eq(s.profile.userId, s.user.id))
          .where(eq(s.user.id, dog.ownerId ?? ''))
          .then(([o]) => o),
    db
      .select({ weekday: s.dogSlot.weekday, time: s.dogSlot.time })
      .from(s.dogSlot)
      .where(eq(s.dogSlot.dogId, dog.id))
      .orderBy(asc(s.dogSlot.weekday), asc(s.dogSlot.time)),
    dog.orgId ? upcomingGroupWalks({ orgId: dog.orgId }) : [],
    viewer ? relationFor(viewer, dog) : null,
  ])

  const isMine = Boolean(viewer && (dog.ownerId === viewer.userId || (dog.orgId && viewer.orgs.some((o) => o.id === dog.orgId))))
  let host: DogDetail['host']
  if (dog.orgId) {
    if (!org || (org.status !== 'verified' && !isMine && !viewer?.isAdmin)) return null
    host = {
      kind: 'shelter', id: org.id, name: org.name, photoUrl: org.logoUrl, city: org.city, verified: org.status === 'verified',
      bio: org.description, phone: org.phone, email: org.email, website: org.website,
      instagram: org.instagram, walkingTimes: org.walkingTimes,
    }
  } else {
    const profile = owner?.profile
    host = {
      kind: 'owner', id: dog.ownerId ?? '', name: profile?.firstName ?? '', photoUrl: profile?.photoUrl ?? null,
      city: profile?.city ?? dog.city, verified: false, bio: profile?.bio, phone: profile?.phone, email: owner?.email,
    }
  }
  if (dog.status !== 'active' && !isMine && !viewer?.isAdmin) return null

  // After a block, even an earlier walk no longer opens the meeting place and contact details.
  const canSeePrivate = isMine || Boolean(viewer?.isAdmin) || Boolean(relation?.hasAccepted && !relation.blocked)
  if (!canSeePrivate) {
    dog.meetingInfo = ''
    dog.vetInfo = ''
    dog.chipNumber = ''
    host.phone = null
    host.email = null
  }
  return { dog, host, slots, groupWalks, canSeePrivate, isMine, relation }
}

/** A verified shelter's public face, for its page of dogs. Never includes the private coordinator. */
export async function publicOrg(orgId: string) {
  const db = await getDb()
  const [org] = await db
    .select({
      id: s.organization.id,
      name: s.organization.name,
      city: s.organization.city,
      country: s.organization.country,
      description: s.organization.description,
      logoUrl: s.organization.logoUrl,
      coverUrl: s.organization.coverUrl,
      website: s.organization.website,
      instagram: s.organization.instagram,
      walkingTimes: s.organization.walkingTimes,
      openingHours: s.organization.openingHours,
      treatsPolicy: s.organization.treatsPolicy,
      provides: s.organization.provides,
      status: s.organization.status,
      isDemo: s.organization.isDemo,
    })
    .from(s.organization)
    .where(eq(s.organization.id, orgId))
  return org && org.status === 'verified' ? org : null
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
  /** The viewer and the other side blocked each other: contact details and the meeting place are left out. */
  blocked: boolean
}

async function requestRows(viewerId: string, where: ReturnType<typeof and>): Promise<RequestRow[]> {
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
  const [walks, blocked] = await Promise.all([
    ids.length
      ? db
          .select({ id: s.walk.id, requestId: s.walk.requestId, status: s.walk.status })
          .from(s.walk)
          .where(inArray(s.walk.requestId, ids))
          .orderBy(desc(s.walk.startedAt))
      : [],
    rows.length ? blockedPeers(viewerId) : new Set<string>(),
  ])
  return rows.map((r) => {
    const w = walks.find((x) => x.requestId === r.request.id)
    const other = r.request.walkerId === viewerId ? r.dog.ownerId : r.walker.id
    const isBlocked = Boolean(other && blocked.has(other))
    return {
      ...r,
      dog: isBlocked ? { ...r.dog, meetingInfo: '' } : r.dog,
      walker: isBlocked && r.walker.id !== viewerId ? { ...r.walker, phone: null, email: '' } : r.walker,
      walkId: w?.id ?? null,
      walkStatus: w?.status ?? null,
      blocked: isBlocked,
    }
  })
}

export async function outgoingRequests(userId: string): Promise<RequestRow[]> {
  return requestRows(userId, and(eq(s.walkRequest.walkerId, userId), ne(s.walkRequest.status, 'cancelled')))
}

export async function incomingRequests(viewer: Viewer): Promise<RequestRow[]> {
  const orgIds = viewer.orgs.map((o) => o.id)
  const ownership = orgIds.length
    ? or(eq(s.dog.ownerId, viewer.userId), inArray(s.dog.orgId, orgIds))
    : eq(s.dog.ownerId, viewer.userId)
  return requestRows(viewer.userId, and(ownership, ne(s.walkRequest.status, 'cancelled')))
}

export async function myDogs(viewer: Viewer): Promise<Dog[]> {
  const db = await getDb()
  return db.select().from(s.dog).where(eq(s.dog.ownerId, viewer.userId)).orderBy(asc(s.dog.createdAt))
}

/** Seintjes (lib/nudges.ts, isSeintje), also kinds that are no longer sent: they are not about a walk. */
export const seintjeKind = or(like(s.notification.kind, 'nudge-%'), eq(s.notification.kind, 'challenge-done'))!

/**
 * Seintjes that are no longer sent in that form are left out of every list and count: kinds without
 * a text any more, and the owner tips from before October 2026 (they have a "tip"; today's text
 * would say something about them that was never checked).
 */
const notRetired = and(
  or(notLike(s.notification.kind, 'nudge-%'), inArray(s.notification.kind, [...NUDGE_KINDS])),
  sql`not (${s.notification.kind} = 'nudge-owner' and ${s.notification.data}->>'tip' is not null)`,
)!

/** Unread notifications, in one question: all of them for the bell, and those about walks for the Rondjes tab. */
export async function unreadCounts(userId: string): Promise<{ all: number; walks: number }> {
  const db = await getDb()
  const [r] = await db
    .select({
      all: count(),
      walks: sql<number>`count(*) filter (where ${not(seintjeKind)})`.mapWith(Number),
    })
    .from(s.notification)
    .where(and(eq(s.notification.userId, userId), isNull(s.notification.readAt), notRetired))
  return r
}

/** Unread notifications. The Rondjes tab leaves seintjes out: they are not about a walk. */
export async function unreadCount(userId: string, { reminders = true } = {}): Promise<number> {
  const db = await getDb()
  const [r] = await db
    .select({ n: count() })
    .from(s.notification)
    .where(and(eq(s.notification.userId, userId), isNull(s.notification.readAt), notRetired, reminders ? undefined : not(seintjeKind)))
  return r.n
}

export async function notificationsFor(userId: string) {
  const db = await getDb()
  return db
    .select()
    .from(s.notification)
    .where(and(eq(s.notification.userId, userId), notRetired))
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
  const [owners, orgs] = await Promise.all([
    ownerIds.length
      ? db
          .select({ id: s.profile.userId, name: s.profile.firstName, phone: s.profile.phone, email: s.user.email })
          .from(s.profile)
          .innerJoin(s.user, eq(s.user.id, s.profile.userId))
          .where(inArray(s.profile.userId, ownerIds))
      : [],
    orgIds.length
      ? db
          .select({ id: s.organization.id, name: s.organization.name, phone: s.organization.phone, email: s.organization.email })
          .from(s.organization)
          .where(inArray(s.organization.id, orgIds))
      : [],
  ])
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

/** Totals for the home page, without example data: finished walks, kilometres and dogs that got out. */
export async function impactTotals(): Promise<{ walks: number; km: number; dogs: number }> {
  const db = await getDb()
  const [row] = await db
    .select({
      walks: count(),
      meters: sql<number>`coalesce(sum(${s.walk.distanceM}), 0)`.mapWith(Number),
      dogs: sql<number>`count(distinct ${s.walk.dogId})`.mapWith(Number),
    })
    .from(s.walk)
    .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
    .where(and(eq(s.walk.status, 'ended'), eq(s.dog.isDemo, false)))
  return { walks: row?.walks ?? 0, km: Math.round((row?.meters ?? 0) / 1000), dogs: row?.dogs ?? 0 }
}

/** The home page shows its counters only once they say something: before that, a small number looks sad. */
export const IMPACT_MIN_WALKS = 50
