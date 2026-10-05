import { distanceM } from './geo'

/** A place as Rondje knows it: the town, and a location rounded to about 500 m when there is one. */
export interface Place {
  country: string
  /** citySlug of the town. */
  town: string
  lat: number | null
  lng: number | null
}

/** Near means within this distance, or the same town when one of the two has no location. */
export const NEAR_KM = 5

/** A count of people nearby is only shown from this many on, so it never points at one neighbour. */
export const SHOW_COUNT_FROM = 3

/** How far apart two places are in metres when near (NEAR_KM for the same town without a location), or null. */
export function nearness(a: Place, b: Place): number | null {
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    const m = distanceM({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng })
    return m <= NEAR_KM * 1000 ? m : null
  }
  return a.town && a.town === b.town && a.country === b.country ? NEAR_KM * 1000 : null
}

/** A count to show, or null when it is too small to show. */
export function shownCount(n: number): number | null {
  return n >= SHOW_COUNT_FROM ? n : null
}
