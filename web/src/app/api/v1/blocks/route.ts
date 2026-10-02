import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { blockUser } from '@/server/actions/safety'

/** Block someone: no more appointments in either direction. */
export async function POST(request: Request) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as { userId?: unknown } | null
  if (typeof body?.userId !== 'string') return fail('invalid')
  const result = await blockUser(body.userId)
  return result.ok ? json({ ok: true }) : fail(result.error ?? 'invalid')
}
