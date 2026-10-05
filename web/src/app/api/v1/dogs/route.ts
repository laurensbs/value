import { NextResponse } from 'next/server'
import { isCountry } from '@/lib/countries'
import { isValidLatLng } from '@/lib/geo'
import { apiActive, dogCard, json } from '@/server/api'
import { listDogs } from '@/server/queries'

/**
 * Dogs to walk. The app sends its position rounded to about 1 km (lat/lng with two decimals);
 * it is only used to sort by distance and is never stored.
 */
export async function GET(request: Request) {
  const viewer = await apiActive()
  if (viewer instanceof NextResponse) return viewer
  const q = new URL(request.url).searchParams
  const lat = Number(q.get('lat'))
  const lng = Number(q.get('lng'))
  const near = q.has('lat') && q.has('lng') && isValidLatLng(lat, lng) ? { lat, lng } : null
  const country = q.get('country') ?? viewer.profile?.country
  const host = q.get('host')
  const items = await listDogs({
    country: country && isCountry(country) ? country : undefined,
    near: near ?? (viewer.profile?.lat != null && viewer.profile.lng != null ? { lat: viewer.profile.lat, lng: viewer.profile.lng } : null),
    energy: q.get('energy') ?? undefined,
    level: q.get('level') ?? undefined,
    host: host === 'owner' || host === 'shelter' ? host : undefined,
    q: q.get('q')?.trim().slice(0, 60) || undefined,
    // Like the website: an account without a finished profile (18+, terms) is not a member yet, so it
    // sees no private owner, no spot on the map, and no order by exact distance (DPIA maatregel M4).
    // Banned accounts never get here (apiActive).
    visitor: !viewer.profile,
  })
  // Your own dogs are not in your list of dogs to walk.
  const mine = new Set(viewer.orgs.map((o) => o.id))
  return json({ dogs: items.filter((i) => i.dog.ownerId !== viewer.userId && !(i.dog.orgId && mine.has(i.dog.orgId))).map(dogCard) })
}
