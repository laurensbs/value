import { describe, expect, it } from 'vitest'
import type { DirectoryShelter } from '@/lib/directory'
import { nearestShelters, normaliseName } from './launch-shelters'

const shelter = (id: string, name: string, lat: number | null, lng: number | null, extra: Partial<DirectoryShelter> = {}): DirectoryShelter => ({
  id, name, lat, lng, country: 'NL', city: null, region: null, website: null, walkingProgram: 'unknown', confidence: 'high', note: null, ...extra,
})

const directory = [
  shelter('far', 'Ver Weg', 53.2, 6.5),
  shelter('near', 'Dichtbij', 52.1, 5.13),
  shelter('mid', 'Middenin', 52.37, 4.89),
  shelter('nopos', 'Zonder plek', null, null),
  shelter('es', 'Protectora', 39.47, -0.38, { country: 'ES' }),
]

describe('nearestShelters', () => {
  it('takes Dutch shelters nearest to Utrecht first, those without a position last', () => {
    expect(nearestShelters(directory, { names: new Set(), ids: new Set() }).map((s) => s.id)).toEqual(['near', 'mid', 'far', 'nopos'])
  })

  it('skips existing contacts by name and shelters already on Rondje', () => {
    const skip = { names: new Set([normaliseName(' DICHTBIJ ')]), ids: new Set(['mid']) }
    expect(nearestShelters(directory, skip, 2).map((s) => s.id)).toEqual(['far', 'nopos'])
  })

  it('prefers a known walking programme at the same distance', () => {
    const twins = [shelter('a', 'A', 52.1, 5.13), shelter('b', 'B', 52.1, 5.13, { walkingProgram: 'yes' })]
    expect(nearestShelters(twins, { names: new Set(), ids: new Set() }).map((s) => s.id)).toEqual(['b', 'a'])
  })
})
