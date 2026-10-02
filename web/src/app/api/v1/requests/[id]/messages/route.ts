import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { chatAccess, chatMessages, markChatRead, sendChat } from '@/server/chat'

/**
 * The chat about one request, oldest first. `?after=<ms>` returns only newer messages, for polling.
 * Reading marks the conversation's message notifications as read.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const { id } = await ctx.params
  const access = await chatAccess(id, viewer)
  if (!access) return fail('forbidden', 403)
  const after = Number(new URL(request.url).searchParams.get('after') ?? 0) || 0
  const messages = await chatMessages(id, after)
  await markChatRead(id, viewer.userId)
  return json({ messages, canSend: access.canSend })
}

/** Send { body } (1 to 1000 characters). Returns the stored message. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as { body?: unknown } | null
  const result = await sendChat(id, viewer, body?.body)
  if (!result.ok) return fail(result.error ?? 'invalid', result.error === 'forbidden' ? 403 : result.error === 'too-many' ? 429 : 400)
  return json({ ok: true, chat: result.chat })
}
