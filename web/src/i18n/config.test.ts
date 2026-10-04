import { describe, expect, it } from 'vitest'
import { fromAcceptLanguage, fromCountry, pickLocale } from './config'

describe('fromAcceptLanguage', () => {
  it('picks the best supported language', () => {
    expect(fromAcceptLanguage('es-ES,es;q=0.9,en;q=0.8')).toBe('es')
    expect(fromAcceptLanguage('fr-BE,fr;q=0.9,nl;q=0.8')).toBe('fr')
    expect(fromAcceptLanguage('de-DE,de;q=0.9,en;q=0.5')).toBe('en')
    expect(fromAcceptLanguage('en-GB')).toBe('en')
  })

  it('is null when the browser names none of our languages', () => {
    expect(fromAcceptLanguage('de-DE')).toBeNull()
    expect(fromAcceptLanguage('*')).toBeNull()
    expect(fromAcceptLanguage('')).toBeNull()
    expect(fromAcceptLanguage(null)).toBeNull()
  })

  it('respects the weights, also out of order, and skips q=0', () => {
    expect(fromAcceptLanguage('nl;q=0.2, en;q=0.9')).toBe('en')
    expect(fromAcceptLanguage('en;q=0, es')).toBe('es')
    expect(fromAcceptLanguage('en;q=0')).toBeNull()
    // Equal weights keep the browser's order.
    expect(fromAcceptLanguage('fr, nl')).toBe('fr')
  })
})

describe('fromCountry', () => {
  it('maps where we speak the language', () => {
    expect(fromCountry('NL')).toBe('nl')
    expect(fromCountry('BE')).toBe('nl')
    expect(fromCountry('ES')).toBe('es')
    expect(fromCountry('MX')).toBe('es')
    expect(fromCountry('AR')).toBe('es')
    expect(fromCountry('FR')).toBe('fr')
    expect(fromCountry('LU')).toBe('fr')
    expect(fromCountry('be')).toBe('nl')
  })

  it('French-speaking Belgium, when the region says so', () => {
    expect(fromCountry('BE', 'WAL')).toBe('fr')
    expect(fromCountry('BE', 'VLG')).toBe('nl')
  })

  it('English anywhere else, nothing when unknown', () => {
    expect(fromCountry('DE')).toBe('en')
    expect(fromCountry('GB')).toBe('en')
    expect(fromCountry('BR')).toBe('en')
    expect(fromCountry(null)).toBeNull()
    expect(fromCountry('')).toBeNull()
    expect(fromCountry('not a country')).toBeNull()
  })
})

describe('pickLocale: cookie > profile > browser > country > Dutch', () => {
  it('an explicit choice wins', () => {
    expect(pickLocale({ cookie: 'fr', profile: 'es', acceptLanguage: 'en', country: 'NL' })).toBe('fr')
    expect(pickLocale({ profile: 'es', acceptLanguage: 'en', country: 'NL' })).toBe('es')
  })

  it('an unknown choice counts as none', () => {
    expect(pickLocale({ cookie: 'de', profile: 'xx', acceptLanguage: 'en', country: 'NL' })).toBe('en')
  })

  it('the browser language beats the country: an English expat in the Netherlands', () => {
    expect(pickLocale({ acceptLanguage: 'en-GB,en;q=0.9', country: 'NL' })).toBe('en')
    expect(pickLocale({ acceptLanguage: 'nl-NL', country: 'ES' })).toBe('nl')
  })

  it('the country decides when the browser language is not ours', () => {
    expect(pickLocale({ acceptLanguage: 'de-DE', country: 'DE' })).toBe('en')
    expect(pickLocale({ acceptLanguage: 'de-DE', country: 'BE' })).toBe('nl')
    expect(pickLocale({ acceptLanguage: 'pt-PT', country: 'ES' })).toBe('es')
    expect(pickLocale({ acceptLanguage: 'ar', country: 'FR' })).toBe('fr')
  })

  it('Dutch when nothing is known', () => {
    expect(pickLocale({})).toBe('nl')
    expect(pickLocale({ acceptLanguage: 'de-DE' })).toBe('nl')
  })
})
