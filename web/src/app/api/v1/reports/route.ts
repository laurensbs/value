import { NextResponse } from 'next/server'
import { apiMember, fail, json } from '@/server/api'
import { createReport } from '@/server/actions/safety'

/** Report a person, dog or walk to moderation (UGC rule 1.2 of the App Store). */
export async function POST(request: Request) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return fail('invalid')
  const form = new FormData()
  for (const key of ['category', 'description', 'subjectUserId', 'dogId', 'walkId', 'orgId']) {
    if (typeof body[key] === 'string' && body[key]) form.set(key, body[key] as string)
  }
  const result = await createReport({ ok: false }, form)
  return result.ok ? json({ ok: true }, 201) : fail(result.error ?? 'invalid')
}
