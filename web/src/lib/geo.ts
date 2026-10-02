export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_M = 6_371_000

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** Total length of a route in metres, ignoring jumps from inaccurate fixes. */
export function routeLengthM(points: LatLng[], maxJumpM = 400): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const d = distanceM(points[i - 1], points[i])
    if (d <= maxJumpM) total += d
  }
  return Math.round(total)
}

/**
 * Rounds a position to a grid of about 500 m, so a public profile never shows
 * someone's exact home. 0.005° latitude ≈ 555 m.
 */
export function fuzz(value: number, step = 0.005): number {
  return Math.round(value / step) * step
}

export function fuzzLatLng(p: LatLng): LatLng {
  return { lat: Number(fuzz(p.lat).toFixed(3)), lng: Number(fuzz(p.lng).toFixed(3)) }
}

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  )
}

export function formatDistance(m: number, locale: string): string {
  if (m < 1000) return `${Math.max(100, Math.round(m / 100) * 100).toLocaleString(locale)} m`
  return `${(m / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} km`
}

/** Distance walked, precise to 10 m (unlike formatDistance, which blurs locations). */
export function formatWalkDistance(m: number, locale: string): string {
  if (m < 1000) return `${(Math.round(m / 10) * 10).toLocaleString(locale)} m`
  return `${(m / 1000).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`
}
