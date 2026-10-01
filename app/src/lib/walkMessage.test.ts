import { describe, expect, it } from 'vitest'
import { DOGS } from '../data/dogs'
import { walkMessage } from './walks'

describe('walkMessage', () => {
  it('names the dog, the area and when you will be back', () => {
    const saar = DOGS.find((d) => d.id === 'saar')!
    const msg = walkMessage(saar, new Date(2026, 9, 2, 9, 0))
    expect(msg).toBe('Ik ga een rondje lopen met Saar in Wittevrouwen. Rond 09:30 ben ik terug.')
  })
})
