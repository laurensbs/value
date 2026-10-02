import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { markProgressSeen } from '@/server/progress'

/** After showing the celebration: { level } is the level that was shown. New badges count as seen too. */
export async function POST(request: Request) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as { level?: unknown } | null
  const level = typeof body?.level === 'number' && Number.isInteger(body.level) ? body.level : null
  if (level == null || level < 1 || level > 10) return fail('invalid')
  await markProgressSeen(viewer.userId, level)
  return json({ ok: true })
}
