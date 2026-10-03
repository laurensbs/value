import { describe, expect, it } from 'vitest'
import { NEAR_KM, nearness, shownCount } from './nearby'

const utrecht = { country: 'NL', town: 'utrecht', lat: 52.09, lng: 5.12 }
const somewhere = { ...utrecht, lat: null, lng: null }

describe('nearness', () => {
  it('measures when both have a location, up to 5 km', () => {
    // 0.01° latitude is about 1.1 km.
    expect(nearness(utrecht, { ...utrecht, lat: 52.1 })).toBeCloseTo(1112, -1)
    expect(nearness(utrecht, { ...utrecht, lat: 52.15 })).toBeNull()
    // The location counts, not the name of the town.
    expect(nearness(utrecht, { ...utrecht, town: 'zeist', lng: 5.17 })).not.toBeNull()
  })

  it('falls back on the town, in the same country, when one has no location', () => {
    expect(nearness(somewhere, utrecht)).toBe(NEAR_KM * 1000)
    expect(nearness(somewhere, { ...utrecht, town: 'zeist' })).toBeNull()
    expect(nearness(somewhere, { ...somewhere, country: 'BE' })).toBeNull()
    expect(nearness({ ...somewhere, town: '' }, { ...somewhere, town: '' })).toBeNull()
  })
})

describe('shownCount', () => {
  it('only shows a count from three on', () => {
    expect(shownCount(0)).toBeNull()
    expect(shownCount(2)).toBeNull()
    expect(shownCount(3)).toBe(3)
  })
})
