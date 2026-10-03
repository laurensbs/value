/** Markers closer than a tap target (in screen pixels, across or down) would cover each other. */
export const OVERLAP_PX = 44

/**
 * Groups items whose markers would overlap on screen. A group sits on its first item, and no two
 * first items overlap, so the numbered markers never cover each other either.
 */
export function groupByOverlap<T>(items: T[], at: (item: T) => { x: number; y: number }, px = OVERLAP_PX): T[][] {
  const groups: { p: { x: number; y: number }; items: T[] }[] = []
  for (const item of items) {
    const p = at(item)
    const near = groups.find((g) => Math.abs(g.p.x - p.x) < px && Math.abs(g.p.y - p.y) < px)
    if (near) near.items.push(item)
    else groups.push({ p, items: [item] })
  }
  return groups.map((g) => g.items)
}
