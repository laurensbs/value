import { describe, expect, it } from 'vitest'
import { DIRECTORY } from './directory'
import { matchDirectory, tipKey } from './tips'

describe('tipKey', () => {
  it('ignores words that only say it is a shelter, in four languages', () => {
    expect(tipKey('Stichting Dierenasiel Amsterdam')).toBe('amsterdam')
    expect(tipKey('dierenasiel amsterdam')).toBe('amsterdam')
    expect(tipKey('Protectora de Animales de Mollet')).toBe('mollet')
    expect(tipKey('Refuge SPA de Liège')).toBe('liege')
    expect(tipKey('Happy Paws Rescue')).toBe('happypaws')
  })

  it('keeps the name when it only has generic words', () => {
    expect(tipKey('Dierenasiel')).toBe('dierenasiel')
  })
})

describe('matchDirectory', () => {
  it('finds a directory shelter by its name in the same country', () => {
    const entry = DIRECTORY[0]
    expect(matchDirectory(entry.name.toUpperCase(), entry.country)?.id).toBe(entry.id)
    expect(matchDirectory(entry.name, entry.country === 'NL' ? 'ES' : 'NL')).toBeUndefined()
  })

  it('does not guess for unknown or very short names', () => {
    expect(matchDirectory('Opvang Nergenshuizen 123', 'NL', 'Nergenshuizen')).toBeUndefined()
    expect(matchDirectory('Opvang', 'NL')).toBeUndefined()
  })
})
