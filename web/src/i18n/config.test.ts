import { describe, expect, it } from 'vitest'
import { fromAcceptLanguage } from './config'

describe('fromAcceptLanguage', () => {
  it('picks the best supported language', () => {
    expect(fromAcceptLanguage('es-ES,es;q=0.9,en;q=0.8')).toBe('es')
    expect(fromAcceptLanguage('fr-BE,fr;q=0.9,nl;q=0.8')).toBe('fr')
    expect(fromAcceptLanguage('de-DE,de;q=0.9,en;q=0.5')).toBe('en')
    expect(fromAcceptLanguage('de-DE')).toBe('nl')
    expect(fromAcceptLanguage(null)).toBe('nl')
  })
})
