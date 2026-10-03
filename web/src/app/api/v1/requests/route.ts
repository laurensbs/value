import { and, eq, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { ageBand } from '@/lib/rules'
import { apiMember, dogLook, fail, json } from '@/server/api'
import { createRequest } from '@/server/actions/requests'
import { meetChecklist } from '@/server/chat'
import { hostContacts, incomingRequests, outgoingRequests, trustGrantsFor, type RequestRow } from '@/server/queries'

const OPEN = ['accepted', 'completed']

/**
 * Appointments: the ones you asked for (outgoing) and the ones for your dogs (incoming). An accepted
 * first meeting carries a `checklist` of what to talk about, for the viewer's side; ticks stay on
 * the device.
 */
export async function GET() {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const [outgoing, incoming] = await Promise.all([outgoingRequests(viewer.userId), incomingRequests(viewer)])
  const contacts = await hostContacts(outgoing.filter((r) => OPEN.includes(r.request.status) && !r.blocked).map((r) => r.dog))
  const grants = await trustGrantsFor([...new Set(incoming.map((r) => r.dog.id))])
  // Which walks this person already gave (private) feedback on, so the app stops asking.
  const walkIds = [...outgoing, ...incoming].map((r) => r.walkId).filter((id): id is string => Boolean(id))
  const db = await getDb()
  const given = walkIds.length
    ? new Set(
        (
          await db
            .select({ walkId: s.feedback.walkId })
            .from(s.feedback)
            .where(and(eq(s.feedback.fromUserId, viewer.userId), inArray(s.feedback.walkId, walkIds)))
        ).map((f) => f.walkId),
      )
    : new Set<string>()

  // What to talk about at a first meeting, for each side.
  const sides = [...outgoing.map((r) => ['walker', r] as const), ...incoming.map((r) => ['host', r] as const)]
  const checklists = new Map(
    await Promise.all(
      sides
        .filter(([, r]) => r.request.kind === 'meet' && r.request.status === 'accepted' && r.walkStatus !== 'active')
        .map(async ([side, r]) => [`${side}:${r.request.id}`, await meetChecklist(side, r.dog.name, r.walker.firstName)] as const),
    ),
  )

  const base = (r: RequestRow) => {
    const accepted = OPEN.includes(r.request.status)
    return {
      id: r.request.id,
      kind: r.request.kind,
      status: r.request.status,
      startsAt: r.request.startsAt,
      durationMin: r.request.durationMin,
      weekly: r.request.weekly,
      message: r.request.message,
      flags: r.request.flags,
      walkId: r.walkId,
      walkStatus: r.walkStatus,
      feedbackGiven: Boolean(r.walkId && given.has(r.walkId)),
      dog: {
        id: r.dog.id,
        name: r.dog.name,
        photos: r.dog.photos,
        look: dogLook(r.dog),
        city: r.dog.city,
        isShelter: Boolean(r.dog.orgId),
        // Where to meet: only once the appointment is accepted.
        meetingInfo: accepted ? r.dog.meetingInfo : '',
      },
    }
  }

  return json({
    outgoing: outgoing.map((r) => ({ ...base(r), host: contacts.get(r.dog.id) ?? null, checklist: checklists.get(`walker:${r.request.id}`) ?? null })),
    incoming: incoming.map((r) => {
      const accepted = OPEN.includes(r.request.status)
      return {
        ...base(r),
        walker: {
          id: r.walker.id,
          firstName: r.walker.firstName,
          photoUrl: r.walker.photoUrl,
          bio: r.walker.bio,
          experience: r.walker.experience,
          ageBand: ageBand(r.walker.birthDate),
          city: r.walker.city,
          phone: accepted ? r.walker.phone : null,
          email: accepted && r.walker.email ? r.walker.email : null,
        },
        trust: grants.get(`${r.dog.id}:${r.walker.id}`) ?? { idSeen: false, soloAllowed: false },
        checklist: checklists.get(`host:${r.request.id}`) ?? null,
      }
    }),
  })
}

/** Ask to meet or walk a dog. All rules (age, quiz, trust, limits) are checked by createRequest. */
export async function POST(request: Request) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return fail('invalid')
  const form = new FormData()
  for (const key of ['dogId', 'kind', 'date', 'time', 'message']) form.set(key, String(body[key] ?? ''))
  if (body.weekly === true) form.set('weekly', 'on')
  const result = await createRequest({ ok: false }, form)
  if (!result.ok) return fail(result.error ?? 'invalid')
  return json({ ok: true, flagged: result.message === 'sent-flagged' }, 201)
}
