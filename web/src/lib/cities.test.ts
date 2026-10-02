import { describe, expect, it } from 'vitest'
import { citySlug, cityList } from './cities'

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
