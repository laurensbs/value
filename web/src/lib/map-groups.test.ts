import { describe, expect, it } from 'vitest'
import { groupByOverlap, OVERLAP_PX } from './map-groups'

const at = (p: { x: number; y: number }) => p

describe('groupByOverlap', () => {
  it('puts markers in the same spot together, in their order', () => {
    const a = { x: 100, y: 100 }
    const b = { x: 100, y: 100 }
    const c = { x: 130, y: 90 }
    expect(groupByOverlap([a, b, c], at)).toEqual([[a, b, c]])
  })

  it('keeps markers apart once they no longer cover each other, across or down', () => {
    const a = { x: 0, y: 0 }
    expect(groupByOverlap([a, { x: OVERLAP_PX, y: 0 }], at)).toHaveLength(2)
    expect(groupByOverlap([a, { x: 0, y: OVERLAP_PX }], at)).toHaveLength(2)
    expect(groupByOverlap([a, { x: OVERLAP_PX - 1, y: OVERLAP_PX - 1 }], at)).toHaveLength(1)
  })

  it('never lets two groups cover each other', () => {
    const points = Array.from({ length: 200 }, (_, i) => ({ x: (i * 37) % 300, y: (i * 53) % 280 }))
    const firsts = groupByOverlap(points, at).map((g) => g[0])
    for (const p of firsts) for (const q of firsts) if (p !== q) expect(Math.abs(p.x - q.x) >= OVERLAP_PX || Math.abs(p.y - q.y) >= OVERLAP_PX).toBe(true)
    expect(groupByOverlap(points, at).flat()).toHaveLength(points.length)
  })
})
