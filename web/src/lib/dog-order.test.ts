import { describe, expect, it } from 'vitest'
import { cellDistanceM, compareForMember, compareForVisitor, gridCell, type DogRank, VISITOR_GRID_KM } from './dog-order'
import { distanceM } from './geo'

const day = (d: number) => new Date(Date.UTC(2026, 9, d))
const rank = (distance: number | null, created: number, isDemo = false): DogRank => ({ distance, createdAt: day(created), isDemo })

describe('the grid for visitors', () => {
  it('gives every spot in a cell the same middle, and cells of about 5 km', () => {
    const middle = gridCell({ lat: 52.09, lng: 5.12 })
    // About 500 m and 1 km away, inside the same cell: the same point.
    const cell = (p: { lat: number; lng: number }) => gridCell(p)
    const corner = { lat: middle.lat - 0.02, lng: middle.lng - 0.03 }
    expect(cell({ lat: middle.lat + 0.004, lng: middle.lng - 0.006 })).toEqual(middle)
    expect(cell(corner)).toEqual(middle)
    // The next row north starts one cell height further, the next cell east one cell width: about 5 km.
    const north = gridCell({ lat: middle.lat + VISITOR_GRID_KM / 111.32, lng: middle.lng })
    expect((north.lat - middle.lat) * 111.32).toBeCloseTo(VISITOR_GRID_KM, 5)
    const east = gridCell({ lat: middle.lat, lng: middle.lng + 0.08 })
    expect(distanceM(middle, east) / 1000).toBeCloseTo(VISITOR_GRID_KM, 0)
  })

  it('measures between cells, so two dogs in one cell are equally near from anywhere', () => {
    const visitor = { lat: 52.05, lng: 5.05 }
    const middle = gridCell({ lat: 52.09, lng: 5.12 })
    const near = { lat: middle.lat - 0.015, lng: middle.lng - 0.02 }
    const far = { lat: middle.lat + 0.015, lng: middle.lng + 0.02 }
    expect(distanceM(visitor, near)).toBeLessThan(distanceM(visitor, far))
    expect(cellDistanceM(visitor, near)).toBe(cellDistanceM(visitor, far))
    expect(cellDistanceM(visitor, null)).toBeNull()
    expect(cellDistanceM(null, near)).toBeNull()
  })

  it('works in the south of Spain and around longitude 0', () => {
    for (const p of [{ lat: 36.72, lng: -4.42 }, { lat: 39.47, lng: -0.376 }, { lat: 39.47, lng: 0.001 }]) {
      const middle = gridCell(p)
      expect(distanceM(p, middle) / 1000).toBeLessThan(VISITOR_GRID_KM)
      expect(gridCell(middle)).toEqual(middle)
    }
  })
})

describe('the order of the list', () => {
  const sort = (list: DogRank[], compare: (a: DogRank, b: DogRank) => number) => [...list].sort(compare)

  it('for a visitor: within the same cell the newest dog first, not the nearest', () => {
    const older = rank(1200, 1)
    const newer = rank(1200, 4)
    expect(sort([older, newer], compareForVisitor)).toEqual([newer, older])
  })

  it('for a visitor: the nearer cell first, unknown spots after that, example dogs last', () => {
    const near = rank(0, 1)
    const nextCell = rank(5000, 5)
    const unknown = rank(null, 6)
    const example = rank(0, 7, true)
    expect(sort([example, unknown, nextCell, near], compareForVisitor)).toEqual([near, nextCell, unknown, example])
  })

  it('for a member: nearest first by the exact distance, as before', () => {
    const near = rank(300, 1)
    const far = rank(900, 4)
    const example = rank(10, 5, true)
    expect(sort([example, far, near], compareForMember)).toEqual([near, far, example])
    // Without a known spot a dog keeps its place among the others (the database order, newest first).
    const unknown = rank(null, 9)
    expect(sort([unknown, near], compareForMember)).toEqual([unknown, near])
  })
})
