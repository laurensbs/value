import { describe, expect, it } from 'vitest'
import { citySlug, cityList, nearbyCities } from './cities'

describe('citySlug', () => {
  it('makes plain, readable slugs', () => {
    expect(citySlug("'s-Hertogenbosch")).toBe('s-hertogenbosch')
    expect(citySlug('València')).toBe('valencia')
    expect(citySlug('  Den Haag ')).toBe('den-haag')
  })
})

describe('cityList', () => {
  it('includes directory cities and adds verified shelter cities once', () => {
    const list = cityList([
      { name: 'Amsterdam', country: 'NL' },
      { name: 'Hoorn', country: 'NL' },
    ])
    expect(list.filter((c) => c.slug === 'amsterdam')).toHaveLength(1)
    expect(list.find((c) => c.slug === 'hoorn')).toMatchObject({ name: 'Hoorn', country: 'NL' })
  })

  it('skips empty names', () => {
    expect(cityList([{ name: '  ', country: 'NL' }]).some((c) => c.slug === '')).toBe(false)
  })
})

describe('nearbyCities', () => {
  const city = (slug: string, country: 'NL' | 'BE' | 'ES', lat: number | null, lng: number | null) => ({ slug, name: slug, country, lat, lng })
  const leiden = city('leiden', 'NL', 52.16, 4.49)
  const all = [
    leiden,
    city('noordwijk', 'NL', 52.23, 4.46),
    city('gouda', 'NL', 52.01, 4.71),
    city('zwolle', 'NL', 52.51, 6.09),
    city('leeuwarden', 'NL', 53.2, 5.8),
    city('gent', 'BE', 51.05, 3.72),
    city('nergens', 'NL', null, null),
  ]

  it('lists the nearest cities in the same country first, without the city itself or places without a location', () => {
    expect(nearbyCities(leiden, all, new Set()).map((c) => c.slug)).toEqual(['noordwijk', 'gouda', 'zwolle', 'leeuwarden'])
    expect(nearbyCities(leiden, all, new Set(), 2).map((c) => c.slug)).toEqual(['noordwijk', 'gouda'])
  })

  it('has nothing to show for a city without any known location', () => {
    expect(nearbyCities(city('nergens', 'NL', null, null), all, new Set(['zwolle']))).toEqual([])
  })

  it('links only cities with something on them, when there are any', () => {
    expect(nearbyCities(leiden, all, new Set(['zwolle', 'leeuwarden', 'gent'])).map((c) => c.slug)).toEqual(['zwolle', 'leeuwarden'])
  })

  it('never shows more than eight', () => {
    expect(nearbyCities(cityList().find((c) => c.slug === 'amsterdam')!, cityList(), new Set())).toHaveLength(8)
  })
})

describe('cityList locations', () => {
  it('takes the middle of the shelters in a city', () => {
    const madrid = cityList().find((c) => c.slug === 'madrid')!
    expect(madrid.lat).toBeCloseTo(40.42)
    expect(madrid.lng).toBeCloseTo(-3.7)
    const hoorn = cityList([{ name: 'Hoorn', country: 'NL', lat: 52.6, lng: 5.0 }, { name: 'Hoorn', country: 'NL', lat: 52.7, lng: 5.1 }]).find((c) => c.slug === 'hoorn')!
    expect(hoorn.lat).toBeCloseTo(52.65)
    expect(hoorn.lng).toBeCloseTo(5.05)
  })
})
