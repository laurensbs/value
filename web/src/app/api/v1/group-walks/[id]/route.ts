import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { joinGroupWalk, leaveGroupWalk } from '@/server/actions/shelters'

/** Join (POST) or leave (DELETE) a group walk at a shelter. */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const result = await joinGroupWalk((await ctx.params).id)
  return result.ok ? json({ ok: true }) : fail(result.error ?? 'invalid')
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const result = await leaveGroupWalk((await ctx.params).id)
  return result.ok ? json({ ok: true }) : fail(result.error ?? 'invalid')
}
