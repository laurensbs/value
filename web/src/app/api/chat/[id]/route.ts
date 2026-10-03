import { NextResponse } from 'next/server'
import { chatAccess, chatMessages, markChatRead } from '@/server/chat'
import { getViewer } from '@/server/session'

/** Polled by the open chat page for new messages. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewer = await getViewer()
  if (!viewer) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 })
  if (viewer.profile?.bannedAt) return NextResponse.json({ error: 'banned' }, { status: 403 })
  const access = await chatAccess(id, viewer)
  if (!access) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const after = Number(new URL(request.url).searchParams.get('after') ?? 0) || 0
  const messages = await chatMessages(id, after)
  if (messages.some((m) => m.senderId !== viewer.userId)) await markChatRead(id, viewer.userId)
  return NextResponse.json({ messages, canSend: access.canSend }, { headers: { 'Cache-Control': 'no-store' } })
}
