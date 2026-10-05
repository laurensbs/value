import { distanceM, type LatLng } from './geo'

/**
 * The order of the list of dogs.
 *
 * A member sees the dogs nearest first, by the exact distance from their own (rounded) location.
 * Someone without an account does not: their position is a guess from the IP address, and sorting by
 * the exact distance from it would still tell, within a town, which private owner's dog lives closer
 * to where. Asked from a few places, that narrows down a spot the dog page itself no longer shows
 * (DPIA maatregel M4). So for them both positions are first rounded to a grid of about 5 km: the
 * nearest part of the country first, and within the same part the newest dogs first.
 */

/** Edge of a grid cell when sorting for someone without an account, in km. */
export const VISITOR_GRID_KM = 5

const KM_PER_DEGREE = 111.32

/**
 * The middle of the grid cell (about `km` by `km`) a position falls in. Every spot in the same cell
 * gives the same point, so an order that uses it says nothing about where in the cell a dog is.
 */
export function gridCell(p: LatLng, km = VISITOR_GRID_KM): LatLng {
  const dLat = km / KM_PER_DEGREE
  const lat = (Math.floor(p.lat / dLat) + 0.5) * dLat
  // Rows keep about the same width east to west: more degrees of longitude per cell towards the poles.
  const dLng = km / (KM_PER_DEGREE * Math.max(0.1, Math.cos((lat * Math.PI) / 180)))
  const lng = (Math.floor(p.lng / dLng) + 0.5) * dLng
  return { lat, lng }
}

/** The distance between the grid cells of two positions, or null when either is unknown. */
export function cellDistanceM(from: LatLng | null | undefined, to: LatLng | null | undefined): number | null {
  if (!from || !to) return null
  return distanceM(gridCell(from), gridCell(to))
}

export interface DogRank {
  isDemo: boolean
  /** Exact for a member, between grid cells for someone without an account; null when not known. */
  distance: number | null
  createdAt: Date
}

/**
 * A member's order, as it always was: example dogs last, then nearest first. Dogs without a known
 * spot keep their place (the database gives them newest first).
 */
export function compareForMember(a: DogRank, b: DogRank): number {
  if (a.isDemo !== b.isDemo) return a.isDemo ? 1 : -1
  if (a.distance != null && b.distance != null) return a.distance - b.distance
  return 0
}

/**
 * The order for someone without an account: example dogs last, then the nearest grid cell first,
 * dogs without a known spot after those, and within the same cell the newest dog first.
 */
export function compareForVisitor(a: DogRank, b: DogRank): number {
  if (a.isDemo !== b.isDemo) return a.isDemo ? 1 : -1
  if (a.distance != null && b.distance != null && a.distance !== b.distance) return a.distance - b.distance
  if ((a.distance == null) !== (b.distance == null)) return a.distance == null ? 1 : -1
  return b.createdAt.getTime() - a.createdAt.getTime()
}
