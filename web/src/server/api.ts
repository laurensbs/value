import 'server-only'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { ready } from '@/db'
import { lookFor, tileFor } from '@/lib/avatar'
import type { DogListItem } from './queries'
import { getViewer, type OnboardedViewer, type Viewer } from './session'

// Helpers for the JSON API of the native iOS app (src/app/api/v1).
//
// The app signs in through Better Auth (/api/auth/sign-in/email) and keeps the session token in
// the Keychain. Every v1 call must carry it as "Authorization: Bearer …". Requests that only carry
// a cookie are refused, so a website in someone's browser can never call these endpoints on
// their behalf (no CSRF through the API).

export const NO_STORE = { 'Cache-Control': 'no-store' }

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

/** An error code plus the same human text the website shows for it, in the caller's language. */
export async function fail(code: string, status = 400): Promise<NextResponse> {
  const t = await getTranslations('request.reasons')
  const message = t.has(code) ? t(code) : (await getTranslations('errors'))('generic')
  return json({ error: code, message }, status)
}

async function hasBearer(): Promise<boolean> {
  return /^Bearer\s+\S+/i.test((await headers()).get('authorization') ?? '')
}

/** The signed-in person behind a bearer token, or an error response. */
export async function apiViewer(): Promise<Viewer | NextResponse> {
  await ready()
  if (!(await hasBearer())) return fail('not-signed-in', 401)
  const viewer = await getViewer()
  if (!viewer) return fail('not-signed-in', 401)
  return viewer
}

/** Like apiViewer, but the person must have finished their profile and not be banned. */
export async function apiMember(): Promise<OnboardedViewer | NextResponse> {
  const viewer = await apiViewer()
  if (viewer instanceof NextResponse) return viewer
  if (!viewer.profile) return fail('not-onboarded', 403)
  if (viewer.profile.bannedAt) return fail('banned', 403)
  return viewer as OnboardedViewer
}

/** The illustrated portrait the app draws for a dog without photos. */
export function dogLook(dog: { id: string; avatar?: unknown }) {
  // A stored portrait may be partial; the generated one fills in what is missing.
  return { ...lookFor({ id: dog.id }), ...lookFor(dog), tile: tileFor(dog.id) }
}

/** A dog card for lists: public fields only. Private ones (meeting place, vet, chip) never go out here. */
export function dogCard(item: DogListItem) {
  const d = item.dog
  return {
    id: d.id,
    name: d.name,
    breed: d.breed,
    sex: d.sex,
    ageYears: d.ageYears,
    size: d.size,
    energy: d.energy,
    level: d.level,
    photos: d.photos,
    look: dogLook(d),
    story: d.story,
    traits: d.traits,
    walkMinutes: d.walkMinutes,
    city: d.city,
    country: d.country,
    // Dogs are shown on the map at their (already rounded) area, never at an address.
    lat: d.lat,
    lng: d.lng,
    isDemo: d.isDemo,
    distanceM: item.distanceM == null ? null : Math.round(item.distanceM),
    host: item.host,
  }
}
