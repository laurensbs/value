import type { DirectoryShelter } from '@/lib/directory'
import { distanceM, type LatLng } from '@/lib/geo'

/** Utrecht: where the first walks are planned. */
export const FIRST_TOWN: LatLng = { lat: 52.09, lng: 5.12 }

/**
 * The shelters to write to first: Dutch shelters from the public directory, nearest to the first
 * town, with a known walking programme first among equals. Skips shelters that are already a
 * contact (same name) or already on Rondje (same directory id).
 */
export function nearestShelters(
  directory: DirectoryShelter[],
  skip: { names: Set<string>; ids: Set<string> },
  n = 10,
  origin: LatLng = FIRST_TOWN,
): DirectoryShelter[] {
  const away = (s: DirectoryShelter) => (s.lat == null || s.lng == null ? Number.POSITIVE_INFINITY : distanceM(origin, { lat: s.lat, lng: s.lng }))
  return directory
    .filter((s) => s.country === 'NL' && !skip.ids.has(s.id) && !skip.names.has(normaliseName(s.name)))
    .map((s) => ({ s, km: Math.round(away(s) / 1000) }))
    .sort((a, b) => a.km - b.km || Number(b.s.walkingProgram === 'yes') - Number(a.s.walkingProgram === 'yes'))
    .slice(0, n)
    .map(({ s }) => s)
}

export function normaliseName(name: string): string {
  return name.trim().toLocaleLowerCase('nl')
}
