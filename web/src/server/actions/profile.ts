'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { scoreQuiz } from '@/lib/quiz'
import { isAdult } from '@/lib/rules'
import { safeNext } from '@/lib/site'
import { location, profileSchema, safePhoto, saveOnboarding } from '../profile-core'
import { actionViewer, getViewer } from '../session'

export interface FormState {
  ok: boolean
  error?: string
  message?: string
}

function readProfile(form: FormData) {
  return profileSchema.safeParse({
    firstName: form.get('firstName'),
    birthDate: form.get('birthDate'),
    country: form.get('country'),
    city: form.get('city'),
    lat: form.get('lat') || undefined,
    lng: form.get('lng') || undefined,
    bio: form.get('bio') ?? '',
    experience: form.get('experience') ?? 'some',
    phone: form.get('phone') ?? '',
    languages: form.getAll('languages'),
    photoUrl: (form.get('photoUrl') as string) || undefined,
    wantsToWalk: form.get('wantsToWalk') === 'on',
    hasDogs: form.get('hasDogs') === 'on',
    weeklyGoal: form.get('weeklyGoal') ? Number(form.get('weeklyGoal')) : null,
  })
}

export async function completeOnboarding(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'not-signed-in' }
  const parsed = readProfile(form)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const result = await saveOnboarding(viewer, parsed.data, {
    termsAccepted: form.get('terms') === 'on',
    locale: await getLocale(),
    referredBy: (await cookies()).get('rondje_ref')?.value ?? null,
  })
  if (!result.ok) return result
  const p = parsed.data
  // Where someone was going, or the first thing to do for the role they chose.
  const start = form.get('intent') === 'shelter' ? '/shelter' : p.hasDogs && !p.wantsToWalk ? '/my-dogs/new?welcome=1' : '/?welcome=1'
  // The whole page changes now (tab bar, header): refresh the layout too, not only the next page.
  revalidatePath('/', 'layout')
  redirect(safeNext(form.get('next') || undefined, start))
}

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await actionViewer()
  const parsed = readProfile(form)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const p = parsed.data
  if (!isAdult(p.birthDate)) return { ok: false, error: 'too-young' }
  const db = await getDb()
  await db
    .update(s.profile)
    .set({
      firstName: p.firstName,
      birthDate: p.birthDate,
      country: p.country,
      city: p.city,
      ...location(p.lat, p.lng),
      bio: p.bio,
      experience: p.experience,
      phone: p.phone || null,
      languages: p.languages,
      // An empty field means the photo was removed; a missing field leaves it as it was.
      photoUrl: form.get('photoUrl') === null ? viewer.profile.photoUrl : safePhoto(p.photoUrl, viewer),
      wantsToWalk: p.wantsToWalk,
      hasDogs: p.hasDogs,
      // A form without the goal (an older app) keeps the one that was set.
      weeklyGoal: !p.wantsToWalk ? null : form.has('weeklyGoal') ? p.weeklyGoal : viewer.profile.weeklyGoal,
      pppLicense: form.get('pppLicense') === 'on',
    })
    .where(eq(s.profile.userId, viewer.userId))
  await db.update(s.user).set({ name: p.firstName }).where(eq(s.user.id, viewer.userId))
  return { ok: true, message: 'saved' }
}

export async function submitQuiz(_prev: FormState & { wrong?: string[] }, form: FormData) {
  const viewer = await actionViewer()
  const answers: Record<string, number> = {}
  for (const [key, value] of form.entries()) {
    if (key.startsWith('q-')) answers[key.slice(2)] = Number(value)
  }
  const result = scoreQuiz(answers)
  if (!result.passed) return { ok: false, error: 'quiz-failed', wrong: result.wrong }
  const db = await getDb()
  await db.update(s.profile).set({ quizPassedAt: new Date() }).where(eq(s.profile.userId, viewer.userId))
  return { ok: true, message: 'quiz-passed', wrong: [] }
}

/** GDPR: removes the account and everything linked to it (cascading deletes). */
export async function deleteAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'not-signed-in' }
  if (String(form.get('confirm') ?? '').trim().toUpperCase() !== 'VERWIJDER' && String(form.get('confirm') ?? '').trim().toUpperCase() !== 'DELETE') {
    return { ok: false, error: 'confirm' }
  }
  const db = await getDb()
  await db.delete(s.user).where(eq(s.user.id, viewer.userId))
  const jar = await cookies()
  for (const c of jar.getAll()) if (c.name.includes('better-auth')) jar.delete(c.name)
  redirect('/?deleted=1')
}

export async function setLocale(locale: string): Promise<void> {
  const { isLocale, LOCALE_COOKIE } = await import('@/i18n/config')
  if (!isLocale(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  // Emails follow the language someone chose.
  const viewer = await getViewer()
  if (viewer?.profile) {
    const db = await getDb()
    await db.update(s.profile).set({ locale }).where(eq(s.profile.userId, viewer.userId))
  }
}

/** Email for important notifications (new request, overdue walk …): on or off. */
export async function setEmailNotifications(on: boolean): Promise<void> {
  const viewer = await actionViewer()
  const db = await getDb()
  await db.update(s.profile).set({ emailNotifications: Boolean(on) }).where(eq(s.profile.userId, viewer.userId))
}

export async function markNotificationsRead(): Promise<void> {
  const viewer = await getViewer()
  if (!viewer) return
  const db = await getDb()
  await db.update(s.notification).set({ readAt: new Date() }).where(eq(s.notification.userId, viewer.userId))
}
