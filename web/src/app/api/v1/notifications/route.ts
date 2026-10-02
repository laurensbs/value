import { NextResponse } from 'next/server'
import { markNotificationsRead } from '@/server/actions/profile'
import { apiViewer, json } from '@/server/api'
import { notificationsFor } from '@/server/queries'

export async function GET() {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const rows = await notificationsFor(viewer.userId)
  return json({ notifications: rows.map((n) => ({ id: n.id, kind: n.kind, data: n.data, read: Boolean(n.readAt), createdAt: n.createdAt })) })
}

/** Mark everything as read. */
export async function POST() {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  await markNotificationsRead()
  return json({ ok: true })
}
