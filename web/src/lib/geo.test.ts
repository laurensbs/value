import { describe, expect, it } from 'vitest'
import { distanceM, formatDistance, fuzzLatLng, isValidLatLng, routeLengthM } from './geo'

describe('geo', () => {
  it('measures distance between Utrecht Centraal and the Dom tower (~1 km)', () => {
    const d = distanceM({ lat: 52.0894, lng: 5.1101 }, { lat: 52.0907, lng: 5.1214 })
    expect(d).toBeGreaterThan(700)
    expect(d).toBeLessThan(900)
  })

  it('rounds public locations to a ~500 m grid', () => {
    const p = fuzzLatLng({ lat: 52.09123, lng: 5.12387 })
    expect(p).toEqual({ lat: 52.09, lng: 5.125 })
  })

  it('ignores GPS jumps when measuring a route', () => {
    const route = [
      { lat: 52.09, lng: 5.12 },
      { lat: 52.091, lng: 5.12 },
      { lat: 52.2, lng: 5.12 },
      { lat: 52.092, lng: 5.12 },
    ]
    expect(routeLengthM(route)).toBeLessThan(250)
  })

  it('validates coordinates', () => {
    expect(isValidLatLng(52, 5)).toBe(true)
    expect(isValidLatLng(91, 5)).toBe(false)
    expect(isValidLatLng('52', 5)).toBe(false)
  })

  it('formats distances per locale', () => {
    expect(formatDistance(1234, 'nl-NL')).toBe('1,2 km')
    expect(formatDistance(40, 'nl-NL')).toBe('100 m')
  })
})
