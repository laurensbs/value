import { describe, expect, it } from 'vitest'
import { appPlaces } from './places'

const keys = (roles: { walker: boolean; owner: boolean }, orgId?: string) => appPlaces(roles, orgId).map((p) => p.key)

describe('appPlaces', () => {
  it('gives walkers the dogs to find, and owners their own dogs', () => {
    expect(keys({ walker: true, owner: false })).toEqual(['today', 'dogs', 'requests'])
    expect(keys({ walker: false, owner: true })).toEqual(['today', 'requests', 'myDogs'])
    expect(keys({ walker: true, owner: true })).toEqual(['today', 'dogs', 'requests', 'myDogs'])
  })

  it('puts the shelter in the place of their own dogs for shelter staff', () => {
    expect(appPlaces({ walker: false, owner: false }, 'org-1')).toEqual([
      { key: 'today', href: '/' },
      { key: 'requests', href: '/requests' },
      { key: 'shelter', href: '/shelter/org-1' },
    ])
    expect(keys({ walker: true, owner: true }, 'org-1')).toEqual(['today', 'dogs', 'requests', 'shelter'])
  })

  it('never has more than four places, so the tab bar (with Profiel) and the wide header stay on one line', () => {
    for (const walker of [true, false]) for (const owner of [true, false]) for (const org of [undefined, 'org-1']) expect(appPlaces({ walker, owner }, org).length).toBeLessThanOrEqual(4)
  })
})
