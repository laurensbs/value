import 'server-only'
import { and, asc, count, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { CHAT_WARN_FLAGS, scanText } from '@/lib/rules'
import type { FormState } from './actions/profile'
import { audit, notify } from './notify'
import { isBlocked } from './queries'
import type { Viewer } from './session'
import { watchers } from './walks'

/** Long enough for directions to a front door, short enough that a chat stays a chat. */
export const CHAT_MAX_LENGTH = 1000
/** A burst limit per person per request, against spam and copy-paste floods. */
export const CHAT_BURST = { messages: 20, minutes: 10 }
/** Requests in these states can still be discussed; declined, cancelled and expired ones are read-only. */
const OPEN_FOR_CHAT = ['pending', 'accepted', 'completed']

export interface ChatMessage {
  id: string
  senderId: string
  name: string
  body: string
  /** What scanText found (money, iban, link, phone, email). CHAT_WARN_FLAGS get a warning for the other person. */
  flags: string[]
  t: number
}


export interface ChatAccess {
  request: typeof s.walkRequest.$inferSelect
  dog: typeof s.dog.$inferSelect
  isWalker: boolean
  /** Everyone in the conversation except the viewer. */
  others: string[]
  canSend: boolean
}

/** The walker and the dog's owner (or its shelter's staff) may read a request's chat. Admins may not. */
export async function chatAccess(requestId: string, viewer: Viewer): Promise<ChatAccess | null> {
  const db = await getDb()
  const [row] = await db
    .select({ request: s.walkRequest, dog: s.dog })
    .from(s.walkRequest)
    .innerJoin(s.dog, eq(s.dog.id, s.walkRequest.dogId))
    .where(eq(s.walkRequest.id, requestId))
  if (!row) return null
  const hosts = await watchers(row.dog)
  const isWalker = row.request.walkerId === viewer.userId
  if (!isWalker && !hosts.includes(viewer.userId)) return null
  const others = isWalker ? hosts : [row.request.walkerId, ...hosts.filter((h) => h !== viewer.userId)]
  // With a private owner there is one other person; a block either way closes the conversation.
  const blocked = row.dog.ownerId ? await isBlocked(viewer.userId, isWalker ? row.dog.ownerId : row.request.walkerId) : false
  const canSend = OPEN_FOR_CHAT.includes(row.request.status) && !blocked && others.length > 0
  return { ...row, isWalker, others, canSend }
}

/** Who the viewer deals with about a request: the owner or the shelter for a walker, else the walker. */
export async function partnerOf(access: ChatAccess): Promise<{ name: string; userId: string | null; orgId: string | null }> {
  const db = await getDb()
  if (access.isWalker && access.dog.orgId) {
    const [org] = await db.select({ name: s.organization.name }).from(s.organization).where(eq(s.organization.id, access.dog.orgId))
    return { name: org?.name ?? '', userId: null, orgId: access.dog.orgId }
  }
  const userId = access.isWalker ? access.dog.ownerId : access.request.walkerId
  if (!userId) return { name: '', userId: null, orgId: null }
  const [p] = await db.select({ name: s.profile.firstName }).from(s.profile).where(eq(s.profile.userId, userId))
  return { name: p?.name ?? '', userId, orgId: null }
}

/** Messages oldest first; `afterMs` returns only newer ones for polling. */
export async function chatMessages(requestId: string, afterMs = 0, limit = 200): Promise<ChatMessage[]> {
  const db = await getDb()
  const rows = await db
    .select({
      id: s.chatMessage.id,
      senderId: s.chatMessage.senderId,
      name: s.profile.firstName,
      body: s.chatMessage.body,
      flags: s.chatMessage.flags,
      t: s.chatMessage.createdAt,
    })
    .from(s.chatMessage)
    .leftJoin(s.profile, eq(s.profile.userId, s.chatMessage.senderId))
    .where(and(eq(s.chatMessage.requestId, requestId), gt(s.chatMessage.createdAt, new Date(afterMs))))
    .orderBy(asc(s.chatMessage.createdAt))
    .limit(limit)
  return rows.map((r) => ({ ...r, name: r.name ?? '', t: r.t.getTime() }))
}

/** Shared by the website and the app: send one message. */
export async function sendChat(requestId: string, viewer: Viewer, raw: unknown): Promise<FormState & { chat?: ChatMessage }> {
  if (!viewer.profile) return { ok: false, error: 'not-onboarded' }
  const body = typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').trim() : ''
  if (!body || body.length > CHAT_MAX_LENGTH) return { ok: false, error: 'invalid' }
  const access = await chatAccess(requestId, viewer)
  if (!access) return { ok: false, error: 'forbidden' }
  if (!access.canSend) return { ok: false, error: 'not-now' }

  const db = await getDb()
  const since = new Date(Date.now() - CHAT_BURST.minutes * 60_000)
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.chatMessage)
    .where(and(eq(s.chatMessage.requestId, requestId), eq(s.chatMessage.senderId, viewer.userId), gt(s.chatMessage.createdAt, since)))
  if (n >= CHAT_BURST.messages) return { ok: false, error: 'too-many' }

  // Rondje is free: talk of money, bank details or payment links is flagged, as in requests.
  const flags = scanText(body)
  const [row] = await db.insert(s.chatMessage).values({ id: crypto.randomUUID(), requestId, senderId: viewer.userId, body, flags }).returning()
  if (flags.some((f) => CHAT_WARN_FLAGS.includes(f))) await audit(db, viewer.userId, 'chat.flagged', 'chat_message', row.id, { requestId, flags })

  // One unread notification per conversation is enough; more would only bury the rest.
  const waiting = await db
    .select({ userId: s.notification.userId })
    .from(s.notification)
    .where(
      and(
        inArray(s.notification.userId, access.others),
        eq(s.notification.kind, 'chat-message'),
        isNull(s.notification.readAt),
        sql`${s.notification.data}->>'requestId' = ${requestId}`,
      ),
    )
  const already = new Set(waiting.map((w) => w.userId))
  const fresh = access.others.filter((u) => !already.has(u))
  if (fresh.length) await notify(db, fresh, 'chat-message', { requestId, dogName: access.dog.name, senderName: viewer.profile.firstName })

  return { ok: true, chat: { id: row.id, senderId: row.senderId, name: viewer.profile.firstName, body: row.body, flags: row.flags, t: row.createdAt.getTime() } }
}

/** Opening a conversation marks its message notifications as read. */
export async function markChatRead(requestId: string, userId: string): Promise<void> {
  const db = await getDb()
  await db
    .update(s.notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(s.notification.userId, userId),
        eq(s.notification.kind, 'chat-message'),
        isNull(s.notification.readAt),
        sql`${s.notification.data}->>'requestId' = ${requestId}`,
      ),
    )
}

/** Requests with an unread message for this person, for a dot on the requests page. */
export async function unreadChats(userId: string): Promise<Set<string>> {
  const db = await getDb()
  const rows = await db
    .select({ requestId: sql<string>`${s.notification.data}->>'requestId'` })
    .from(s.notification)
    .where(and(eq(s.notification.userId, userId), eq(s.notification.kind, 'chat-message'), isNull(s.notification.readAt)))
  return new Set(rows.map((r) => r.requestId))
}
