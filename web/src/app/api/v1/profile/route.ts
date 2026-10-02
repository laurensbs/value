import { NextResponse } from 'next/server'
import { getLocale } from 'next-intl/server'
import { updateProfile } from '@/server/actions/profile'
import { apiMember, apiViewer, fail, json } from '@/server/api'
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

/** Editing the profile from the app. The photo stays as it is; the same checks as the website apply. */
export async function PATCH(request: Request) {
  const viewer = await apiMember()
  if (viewer instanceof NextResponse) return viewer
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return fail('invalid')
  const p = viewer.profile
  const value = (key: string, fallback: string | number | null) => String(body[key] ?? fallback ?? '')
  const form = new FormData()
  form.set('firstName', value('firstName', p.firstName))
  form.set('birthDate', p.birthDate)
  form.set('country', value('country', p.country))
  form.set('city', value('city', p.city))
  // Keep the stored (already rounded) area unless the app sends a new one.
  const lat = typeof body.lat === 'number' ? body.lat : p.lat
  const lng = typeof body.lng === 'number' ? body.lng : p.lng
  if (lat != null && lng != null) {
    form.set('lat', String(lat))
    form.set('lng', String(lng))
  }
  form.set('bio', value('bio', p.bio))
  form.set('experience', value('experience', p.experience))
  form.set('phone', value('phone', p.phone))
  for (const l of Array.isArray(body.languages) ? body.languages : p.languages) form.append('languages', String(l))
  if (body.wantsToWalk ?? p.wantsToWalk) form.set('wantsToWalk', 'on')
  if (body.hasDogs ?? p.hasDogs) form.set('hasDogs', 'on')
  if (body.pppLicense ?? p.pppLicense) form.set('pppLicense', 'on')
  // Walks a week (1–7); null clears the goal, leaving it out keeps it.
  const goal = 'weeklyGoal' in body ? body.weeklyGoal : p.weeklyGoal
  form.set('weeklyGoal', typeof goal === 'number' ? String(goal) : '')
  // A new photo from the app (uploaded through /api/upload first); without one the photo stays as it is.
  if (typeof body.photoUrl === 'string') form.set('photoUrl', body.photoUrl)
  const result = await updateProfile({ ok: false }, form)
  return result.ok ? json({ ok: true }) : fail(result.error ?? 'invalid')
}
