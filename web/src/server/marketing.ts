import 'server-only'
import { eq, inArray, like, or } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { POST_PREFIX } from '@/components/marketing-hub/posts'
import { adminEmails } from '@/lib/site'
import { tipKey } from '@/lib/tips'
import { publicCities } from './cities'
import { answers, thisWeek, type MarketingFacts } from './marketing-core'

/** Example rows from the seed (src/db/seed.ts) have ids and e-mail addresses like these. */
const isDemoId = (id: string | null | undefined) => Boolean(id?.startsWith('demo-'))
const isDemoEmail = (email: string) => email.toLowerCase().endsWith('@demo.example.org')

/**
 * Everything the marketing hub shows, from real data. Only counts, towns, shelter names and the
 * admin's own campaign codes leave this function: never a member's name or contact details.
 * Example data (is_demo, ids "demo-…", @demo.example.org) and the admins never count.
 */
export async function marketingData(now = new Date()) {
  const db = await getDb()
  const [accountRows, memberRows, dogRows, requestRows, walkRows, voteRows, signupRows, orgRows, contactRows, taskRows, cities] = await Promise.all([
    db
      .select({ id: s.user.id, email: s.user.email, role: s.user.role, at: s.user.createdAt, profileId: s.profile.userId })
      .from(s.user)
      .leftJoin(s.profile, eq(s.profile.userId, s.user.id)),
    db
      .select({
        id: s.profile.userId,
        email: s.user.email,
        role: s.user.role,
        at: s.profile.createdAt,
        wantsToWalk: s.profile.wantsToWalk,
        hasDogs: s.profile.hasDogs,
        bannedAt: s.profile.bannedAt,
        country: s.profile.country,
        city: s.profile.city,
        lat: s.profile.lat,
        lng: s.profile.lng,
        referredBy: s.profile.referredBy,
        referralCode: s.profile.referralCode,
      })
      .from(s.profile)
      .innerJoin(s.user, eq(s.user.id, s.profile.userId)),
    db
      .select({
        id: s.dog.id,
        ownerId: s.dog.ownerId,
        orgId: s.dog.orgId,
        status: s.dog.status,
        isDemo: s.dog.isDemo,
        country: s.dog.country,
        city: s.dog.city,
        lat: s.dog.lat,
        lng: s.dog.lng,
        orgStatus: s.organization.status,
        orgIsDemo: s.organization.isDemo,
      })
      .from(s.dog)
      .leftJoin(s.organization, eq(s.organization.id, s.dog.orgId)),
    db
      .select({ walkerId: s.walkRequest.walkerId, dogId: s.dog.id, ownerId: s.dog.ownerId, dogIsDemo: s.dog.isDemo, status: s.walkRequest.status, at: s.walkRequest.createdAt })
      .from(s.walkRequest)
      .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId)),
    db
      .select({ walkerId: s.walk.walkerId, dogId: s.walk.dogId, ownerId: s.dog.ownerId, dogIsDemo: s.dog.isDemo, at: s.walk.endedAt })
      .from(s.walk)
      .innerJoin(s.dog, eq(s.dog.id, s.walk.dogId))
      .where(eq(s.walk.status, 'ended')),
    // Open tips and votes, like Beheer → Tips en stemmen.
    db
      .select({
        voterId: s.suggestion.suggestedBy,
        directoryId: s.suggestion.directoryId,
        name: s.suggestion.name,
        city: s.suggestion.city,
        country: s.suggestion.country,
      })
      .from(s.suggestion)
      .where(inArray(s.suggestion.status, ['new', 'contacted'])),
    db
      .select({ userId: s.groupWalkSignup.userId, status: s.groupWalkSignup.status, orgId: s.organization.id, orgIsDemo: s.organization.isDemo })
      .from(s.groupWalkSignup)
      .innerJoin(s.groupWalk, eq(s.groupWalk.id, s.groupWalkSignup.groupWalkId))
      .innerJoin(s.organization, eq(s.organization.id, s.groupWalk.orgId)),
    db.select({ id: s.organization.id, name: s.organization.name, status: s.organization.status, isDemo: s.organization.isDemo, createdBy: s.organization.createdBy }).from(s.organization),
    db.select({ audience: s.outreachContact.audience, status: s.outreachContact.status, organisation: s.outreachContact.organisation }).from(s.outreachContact),
    db
      .select({ key: s.launchTask.key, status: s.launchTask.status })
      .from(s.launchTask)
      .where(or(eq(s.launchTask.key, 'analytics'), like(s.launchTask.key, `${POST_PREFIX}%`))),
    publicCities(),
  ])

  const admins = new Set(adminEmails())
  const isAdmin = (email: string, role: string) => role === 'admin' || admins.has(email.toLowerCase())
  const demoPerson = (id: string, email: string) => isDemoId(id) || isDemoEmail(email)
  const people = new Map(memberRows.map((m) => [m.id, { demo: demoPerson(m.id, m.email), admin: isAdmin(m.email, m.role) }]))
  // A row about a person counts only when that person is real: not example data, not an admin.
  const personFlags = (id: string | null) => {
    const p = id ? people.get(id) : undefined
    return { demo: Boolean(p?.demo) || isDemoId(id), admin: Boolean(p?.admin) }
  }

  const facts: MarketingFacts = {
    accounts: accountRows.map((a) => ({ id: a.id, at: a.at, hasProfile: Boolean(a.profileId), demo: demoPerson(a.id, a.email), admin: isAdmin(a.email, a.role) })),
    members: memberRows.map((m) => ({
      id: m.id,
      at: m.at,
      demo: demoPerson(m.id, m.email),
      admin: isAdmin(m.email, m.role),
      walker: m.wantsToWalk,
      owner: m.hasDogs,
      banned: Boolean(m.bannedAt),
      country: m.country,
      city: m.city,
      lat: m.lat,
      lng: m.lng,
      referredBy: m.referredBy,
      referralCode: m.referralCode,
    })),
    dogs: dogRows.map((d) => ({
      id: d.id,
      ownerId: d.ownerId,
      orgId: d.orgId,
      status: d.status,
      live: d.status === 'active' && (!d.orgId || d.orgStatus === 'verified'),
      demo: d.isDemo || isDemoId(d.id) || Boolean(d.orgIsDemo) || personFlags(d.ownerId).demo,
      admin: personFlags(d.ownerId).admin,
      country: d.country,
      city: d.city,
      lat: d.lat,
      lng: d.lng,
    })),
    requests: requestRows.map((r) => ({
      walkerId: r.walkerId,
      ownerId: r.ownerId,
      status: r.status,
      at: r.at,
      demo: r.dogIsDemo || isDemoId(r.dogId) || personFlags(r.walkerId).demo || personFlags(r.ownerId).demo,
      admin: personFlags(r.walkerId).admin,
    })),
    walks: walkRows
      .filter((w) => w.at)
      .map((w) => ({
        walkerId: w.walkerId,
        dogId: w.dogId,
        ownerId: w.ownerId,
        at: w.at!,
        demo: w.dogIsDemo || isDemoId(w.dogId) || personFlags(w.walkerId).demo || personFlags(w.ownerId).demo,
        admin: personFlags(w.walkerId).admin,
      })),
    votes: voteRows.map((v) => ({
      voterId: v.voterId,
      key: v.directoryId ?? `${v.country}:${tipKey(v.name)}`,
      name: v.name,
      city: v.city,
      country: v.country,
      ...personFlags(v.voterId),
    })),
    groupSignups: signupRows.map((g) => ({ userId: g.userId, status: g.status, demo: g.orgIsDemo || isDemoId(g.orgId) || personFlags(g.userId).demo, admin: personFlags(g.userId).admin })),
    orgs: orgRows.map((o) => ({ createdBy: o.createdBy, status: o.status, demo: o.isDemo || isDemoId(o.id), admin: false })),
    contacts: contactRows,
    adminCodes: memberRows.filter((m) => isAdmin(m.email, m.role)).map((m) => m.referralCode),
    analyticsOn: taskRows.some((t) => t.key === 'analytics' && t.status === 'done'),
  }

  const list = answers(facts, now)
  const realMembers = facts.members.filter((m) => !m.demo && !m.admin)
  return {
    answers: list,
    thisWeek: thisWeek(list),
    posted: taskRows.filter((t) => t.key.startsWith(POST_PREFIX) && t.status === 'done').map((t) => t.key.slice(POST_PREFIX.length)),
    /** For the "6 weken" post: the real numbers to fill in. */
    totals: {
      members: realMembers.length,
      dogs: facts.dogs.filter((d) => !d.demo && !d.admin && d.live).length,
      walks: facts.walks.filter((w) => !w.demo && !w.admin).length,
    },
    cities: cities.map((c) => ({ slug: c.slug, name: c.name, country: c.country })),
    /** Verified real shelters: each has its own printable poster. */
    shelters: orgRows.filter((o) => o.status === 'verified' && !o.isDemo && !isDemoId(o.id)).map((o) => ({ id: o.id, name: o.name })),
  }
}

export type MarketingData = Awaited<ReturnType<typeof marketingData>>
