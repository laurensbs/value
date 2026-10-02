'use server'

import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isCountry } from '@/lib/countries'
import { fuzzLatLng, isValidLatLng } from '@/lib/geo'
import { scoreQuiz } from '@/lib/quiz'
import { isAllowedPhotoUrl } from '@/lib/photos'
import { isAdult } from '@/lib/rules'
import { safeNext, TERMS_VERSION } from '@/lib/site'
import { actionViewer, getViewer } from '../session'

export interface FormState {
  ok: boolean
  error?: string
  message?: string
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(40),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  country: z.string().refine(isCountry),
  city: z.string().trim().min(1).max(60),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  bio: z.string().trim().max(600).default(''),
  experience: z.enum(['none', 'some', 'lots']),
  phone: z.string().trim().max(30).default(''),
  languages: z.array(z.enum(['nl', 'en', 'es', 'fr', 'de'])).default([]),
  photoUrl: z.string().max(600_000).optional(),
  wantsToWalk: z.boolean(),
  hasDogs: z.boolean(),
})

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
  })
}

/** Our own uploads, or the picture from the person's Google/Apple account (or the one they already had). */
function safePhoto(url: string | undefined, viewer: { image: string | null; profile: { photoUrl: string | null } | null }): string | null {
  if (!url) return null
  return isAllowedPhotoUrl(url) || url === viewer.image || url === viewer.profile?.photoUrl ? url : null
}

function location(lat?: number, lng?: number) {
  return lat !== undefined && lng !== undefined && isValidLatLng(lat, lng) ? fuzzLatLng({ lat, lng }) : { lat: null, lng: null }
}

function referralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => alphabet[b % alphabet.length]).join('')
}

export async function completeOnboarding(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'not-signed-in' }
  const parsed = readProfile(form)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const p = parsed.data
  if (!isAdult(p.birthDate)) return { ok: false, error: 'too-young' }
  if (form.get('terms') !== 'on') return { ok: false, error: 'terms' }

  const db = await getDb()
  const values = {
    firstName: p.firstName,
    birthDate: p.birthDate,
    country: p.country,
    city: p.city,
    ...location(p.lat, p.lng),
    bio: p.bio,
    experience: p.experience,
    phone: p.phone || null,
    languages: p.languages,
    photoUrl: safePhoto(p.photoUrl, viewer),
    wantsToWalk: p.wantsToWalk,
    hasDogs: p.hasDogs,
    termsAcceptedAt: new Date(),
    termsVersion: TERMS_VERSION,
  }
  const referredBy = (await cookies()).get('rondje_ref')?.value ?? null
  if (viewer.profile) {
    await db.update(s.profile).set(values).where(eq(s.profile.userId, viewer.userId))
  } else {
    await db.insert(s.profile).values({ userId: viewer.userId, ...values, referralCode: referralCode(), referredBy })
  }
  await db.update(s.user).set({ name: p.firstName }).where(eq(s.user.id, viewer.userId))

  redirect(safeNext(form.get('next') || undefined, p.hasDogs && !p.wantsToWalk ? '/my-dogs/new' : '/dogs'))
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
}

export async function markNotificationsRead(): Promise<void> {
  const viewer = await getViewer()
  if (!viewer) return
  const db = await getDb()
  await db.update(s.notification).set({ readAt: new Date() }).where(eq(s.notification.userId, viewer.userId))
}
