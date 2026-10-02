import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'
import { apiViewer, fail, json } from '@/server/api'
import { profileSchema, saveOnboarding } from '@/server/profile-core'

/** Finishing the profile after sign-up, from the app. Same rules as the website: 18+, terms accepted. */
export async function POST(request: Request) {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const parsed = profileSchema.safeParse({ ...body, photoUrl: undefined })
  if (!parsed.success) return fail('invalid')
  const result = await saveOnboarding(viewer, parsed.data, {
    termsAccepted: body?.termsAccepted === true,
    locale: await getLocale(),
    referredBy: typeof body?.referredBy === 'string' ? body.referredBy.slice(0, 12) : null,
  })
  return result.ok ? json({ ok: true }) : fail(result.error ?? 'invalid')
}
