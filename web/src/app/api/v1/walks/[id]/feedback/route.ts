import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { submitFeedback } from '@/server/actions/walks'

/** Private feedback after a walk; the other person never sees it. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const { id } = await ctx.params
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return fail('invalid')
  const form = new FormData()
  form.set('walkId', id)
  for (const key of ['dogCondition', 'dogBehaviour', 'note']) if (typeof body[key] === 'string') form.set(key, body[key] as string)
  for (const key of ['onTime', 'wouldAgain', 'handoverOk', 'feltSafe']) form.set(key, body[key] === true ? 'yes' : 'no')
  const result = await submitFeedback({ ok: false }, form)
  return result.ok ? json({ ok: true }) : fail(result.error ?? 'invalid')
}
