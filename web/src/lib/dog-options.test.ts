import { describe, expect, it } from 'vitest'
import { shelterDogDefaults } from './dog-options'

describe('shelterDogDefaults', () => {
  it('uses the shelter defaults', () => {
    expect(shelterDogDefaults({ treatsPolicy: 'no', provides: ['harness', 'water'], defaultWalkMinutes: 60 })).toEqual({
      treats: 'no',
      provides: ['harness', 'water'],
      walkMinutes: 60,
    })
  })

  it('cleans up unknown values and falls back to bags and a leash', () => {
    expect(shelterDogDefaults({ treatsPolicy: 'sometimes', provides: ['cape', 'bags', 'bags'], defaultWalkMinutes: 500 })).toEqual({
      treats: 'own',
      provides: ['bags'],
      walkMinutes: 180,
    })
    expect(shelterDogDefaults({ treatsPolicy: 'yes', provides: [], defaultWalkMinutes: null })).toEqual({
      treats: 'yes',
      provides: ['bags', 'leash'],
      walkMinutes: 45,
    })
  })
})
