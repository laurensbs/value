'use server'

import { and, count, eq, inArray, lt } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { canRecordTrust, canRequestMeeting, canRequestSolo, checkMeetVia, isInPerson, MEET_VIAS, scanText } from '@/lib/rules'
import { zonedToUtc } from '@/lib/time'
import { audit, notify } from '../notify'
import { dogFacts, relationFor, walkerFacts } from '../queries'
import { actionViewer, isOrgMember, type OnboardedViewer } from '../session'
import type { FormState } from './profile'

const requestSchema = z.object({
  dogId: z.string().min(1),
  kind: z.enum(['meet', 'solo']),
  /** How a first meeting happens. Older apps leave it out: then it is a walk together, as before. */
  meetVia: z.enum(MEET_VIAS).default('walk'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  weekly: z.boolean(),
  message: z.string().trim().max(800).default(''),
})

/** The people who decide about a dog: its owner, or every member of its shelter. */
async function deciders(dog: typeof s.dog.$inferSelect): Promise<string[]> {
  if (dog.ownerId) return [dog.ownerId]
  if (!dog.orgId) return []
  const db = await getDb()
  const members = await db
    .select({ id: s.organizationMember.userId })
    .from(s.organizationMember)
    .where(eq(s.organizationMember.orgId, dog.orgId))
  return members.map((m) => m.id)
}

function canDecide(viewer: OnboardedViewer, dog: typeof s.dog.$inferSelect): boolean {
  return dog.ownerId === viewer.userId || isOrgMember(viewer, dog.orgId)
}

async function orgVerified(orgId: string): Promise<boolean> {
  const db = await getDb()
  const [org] = await db.select({ status: s.organization.status }).from(s.organization).where(eq(s.organization.id, orgId))
  return org?.status === 'verified'
}

export async function createRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await actionViewer()
  const parsed = requestSchema.safeParse({
    dogId: form.get('dogId'),
    kind: form.get('kind'),
    meetVia: form.get('meetVia') || undefined,
    date: form.get('date'),
    time: form.get('time'),
    weekly: form.get('weekly') === 'on',
    message: form.get('message') ?? '',
  })
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const r = parsed.data

  const db = await getDb()
  const [dog] = await db.select().from(s.dog).where(eq(s.dog.id, r.dogId))
  if (!dog) return { ok: false, error: 'dog-unavailable' }
  // A shelter's dogs can be asked for once Rondje checked the shelter.
  if (dog.orgId && !(await orgVerified(dog.orgId))) return { ok: false, error: 'dog-unavailable' }

  const startsAt = zonedToUtc(r.date, r.time)
  const inMs = startsAt.getTime() - Date.now()
  if (!Number.isFinite(inMs) || inMs < 15 * 60_000) return { ok: false, error: 'too-soon' }
  if (inMs > 60 * 24 * 60 * 60_000) return { ok: false, error: 'too-far' }

  const facts = await walkerFacts(viewer)
  const relation = await relationFor(viewer, dog)
  const reason =
    r.kind === 'solo' ? canRequestSolo(facts, dogFacts(dog), relation) : canRequestMeeting(facts, dogFacts(dog), relation)
  if (reason) return { ok: false, error: reason }
  // Only a first meeting with a private owner's dog can be a home visit or a call (lib/rules.ts).
  const via = checkMeetVia(r.kind, r.meetVia, dog)
  if (via) return { ok: false, error: via }

  const flags = scanText(r.message)
  const id = crypto.randomUUID()
  await db.insert(s.walkRequest).values({
    id,
    dogId: dog.id,
    walkerId: viewer.userId,
    kind: r.kind,
    meetVia: r.meetVia,
    startsAt,
    durationMin: dog.walkMinutes,
    weekly: r.kind === 'solo' && r.weekly,
    message: r.message,
    flags,
  })
  // After a first call, planning to meet in person closes that call (it shows as done, not as walked).
  if (r.kind === 'meet' && isInPerson(r.meetVia)) {
    await db
      .update(s.walkRequest)
      .set({ status: 'completed' })
      .where(
        and(
          eq(s.walkRequest.dogId, dog.id),
          eq(s.walkRequest.walkerId, viewer.userId),
          eq(s.walkRequest.status, 'accepted'),
          inArray(s.walkRequest.meetVia, ['phone', 'video']),
          lt(s.walkRequest.startsAt, new Date()),
        ),
      )
  }
  await notify(db, await deciders(dog), 'request-new', {
    requestId: id,
    dogName: dog.name,
    walkerName: viewer.profile.firstName,
    ...(r.kind === 'meet' ? { meetVia: r.meetVia } : {}),
  })
  if (flags.includes('money') || flags.includes('iban')) {
    await audit(db, viewer.userId, 'request.flagged', 'walk_request', id, { flags })
  }
  revalidatePath('/requests')
  return { ok: true, message: flags.length ? 'sent-flagged' : 'sent' }
}

export async function respondToRequest(requestId: string, decision: 'accept' | 'decline'): Promise<FormState> {
  const viewer = await actionViewer()
  const db = await getDb()
  const [row] = await db
    .select({ request: s.walkRequest, dog: s.dog })
    .from(s.walkRequest)
    .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId))
    .where(eq(s.walkRequest.id, requestId))
  if (!row || !canDecide(viewer, row.dog)) return { ok: false, error: 'forbidden' }
  if (row.request.status !== 'pending') return { ok: false, error: 'already-decided' }
  // A dog a moderator took offline cannot get new appointments; saying no stays possible.
  if (decision === 'accept' && row.dog.status === 'hidden') return { ok: false, error: 'dog-unavailable' }

  await db
    .update(s.walkRequest)
    .set({ status: decision === 'accept' ? 'accepted' : 'declined', decidedBy: viewer.userId, decidedAt: new Date() })
    .where(eq(s.walkRequest.id, requestId))
  await notify(db, [row.request.walkerId], decision === 'accept' ? 'request-accepted' : 'request-declined', {
    requestId,
    dogName: row.dog.name,
    ...(row.request.kind === 'meet' ? { meetVia: row.request.meetVia } : {}),
  })
  revalidatePath('/requests')
  return { ok: true }
}

export async function cancelRequest(requestId: string): Promise<FormState> {
  const viewer = await actionViewer()
  const db = await getDb()
  const [row] = await db
    .select({ request: s.walkRequest, dog: s.dog })
    .from(s.walkRequest)
    .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId))
    .where(eq(s.walkRequest.id, requestId))
  if (!row) return { ok: false, error: 'forbidden' }
  const isWalker = row.request.walkerId === viewer.userId
  if (!isWalker && !canDecide(viewer, row.dog)) return { ok: false, error: 'forbidden' }
  if (!['pending', 'accepted'].includes(row.request.status)) return { ok: false, error: 'already-decided' }

  await db.update(s.walkRequest).set({ status: 'cancelled' }).where(eq(s.walkRequest.id, requestId))
  await notify(db, isWalker ? await deciders(row.dog) : [row.request.walkerId], 'request-cancelled', {
    requestId,
    dogName: row.dog.name,
  })
  revalidatePath('/requests')
  return { ok: true }
}

/**
 * After meeting a walker in person, the owner or shelter can record that they saw the walker's ID
 * (no copy is stored) and allow solo walks with this dog. A phone or video call never counts.
 */
export async function setTrust(dogId: string, walkerId: string, input: { idSeen: boolean; soloAllowed: boolean }): Promise<FormState> {
  const viewer = await actionViewer()
  const db = await getDb()
  const [dog] = await db.select().from(s.dog).where(eq(s.dog.id, dogId))
  if (!dog || !canDecide(viewer, dog)) return { ok: false, error: 'forbidden' }
  // Shelter dogs are always walked in supervised groups.
  const soloAllowed = dog.orgId ? false : input.soloAllowed

  const [requests, [walked]] = await Promise.all([
    db
      .select({ status: s.walkRequest.status, meetVia: s.walkRequest.meetVia })
      .from(s.walkRequest)
      .where(and(eq(s.walkRequest.dogId, dogId), eq(s.walkRequest.walkerId, walkerId))),
    db
      .select({ n: count() })
      .from(s.walk)
      .where(and(eq(s.walk.dogId, dogId), eq(s.walk.walkerId, walkerId))),
  ])
  // Taking trust back is always possible; giving it needs a meeting in person.
  const reason = canRecordTrust(requests, walked.n)
  if (reason && (reason === 'needs-meeting' || input.idSeen || soloAllowed)) return { ok: false, error: reason }

  await db
    .insert(s.trustGrant)
    .values({ dogId, walkerId, grantedBy: viewer.userId, idSeen: input.idSeen, soloAllowed })
    .onConflictDoUpdate({
      target: [s.trustGrant.dogId, s.trustGrant.walkerId],
      set: { idSeen: input.idSeen, soloAllowed, grantedBy: viewer.userId, updatedAt: new Date() },
    })
  if (input.idSeen) {
    await db
      .insert(s.idCheck)
      .values({ id: crypto.randomUUID(), walkerId, checkedBy: viewer.userId, orgId: dog.orgId })
      .onConflictDoNothing()
  }
  if (soloAllowed) await notify(db, [walkerId], 'trust-granted', { dogId, dogName: dog.name })
  await audit(db, viewer.userId, 'trust.set', 'dog', dogId, { walkerId, ...input })
  revalidatePath('/requests')
  return { ok: true }
}
