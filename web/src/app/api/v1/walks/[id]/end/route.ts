import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { finishWalk } from '@/server/walks'

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const { id } = await ctx.params
  const result = await finishWalk(id, viewer)
  return result.ok ? json({ ok: true, distanceM: result.distanceM ?? 0 }) : fail(result.error ?? 'invalid', 403)
}
