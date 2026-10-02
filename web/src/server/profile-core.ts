import 'server-only'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '@/db'
import * as s from '@/db/schema'
import { isCountry } from '@/lib/countries'
import { fuzzLatLng, isValidLatLng } from '@/lib/geo'
import { isAllowedPhotoUrl } from '@/lib/photos'
import { isAdult } from '@/lib/rules'
import { TERMS_VERSION } from '@/lib/site'
import type { FormState } from './actions/profile'
import type { Viewer } from './session'

// Profile rules shared by the website's forms and the app API (src/app/api/v1).

export const profileSchema = z.object({
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
  /** Walks a week someone aims for (walkers only), or null. */
  weeklyGoal: z.number().int().min(1).max(7).nullable().default(null),
})

/** Our own uploads, or the picture from the person's Google/Apple account (or the one they already had). */
export function safePhoto(url: string | undefined, viewer: { image: string | null; profile: { photoUrl: string | null } | null }): string | null {
  if (!url) return null
  return isAllowedPhotoUrl(url) || url === viewer.image || url === viewer.profile?.photoUrl ? url : null
}

export function location(lat?: number, lng?: number) {
  return lat !== undefined && lng !== undefined && isValidLatLng(lat, lng) ? fuzzLatLng({ lat, lng }) : { lat: null, lng: null }
}

function referralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => alphabet[b % alphabet.length]).join('')
}

export type ProfileInput = z.infer<typeof profileSchema>

/** Creates (or completes) someone's profile after sign-up. Adults only, and only with the terms accepted. */
export async function saveOnboarding(
  viewer: Viewer,
  p: ProfileInput,
  opts: { termsAccepted: boolean; locale: string; referredBy: string | null },
): Promise<FormState> {
  if (!isAdult(p.birthDate)) return { ok: false, error: 'too-young' }
  if (!opts.termsAccepted) return { ok: false, error: 'terms' }

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
    weeklyGoal: p.wantsToWalk ? p.weeklyGoal : null,
    termsAcceptedAt: new Date(),
    termsVersion: TERMS_VERSION,
    locale: opts.locale,
  }
  if (viewer.profile) {
    await db.update(s.profile).set(values).where(eq(s.profile.userId, viewer.userId))
  } else {
    await db.insert(s.profile).values({ userId: viewer.userId, ...values, referralCode: referralCode(), referredBy: opts.referredBy })
  }
  await db.update(s.user).set({ name: p.firstName }).where(eq(s.user.id, viewer.userId))

  return { ok: true }
}
