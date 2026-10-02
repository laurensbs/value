import { describe, expect, it } from 'vitest'
import { emailMatchesWebsite, normalizeInstagram, normalizeWebsite, readOrgForm, registryLookupUrl } from './org-fields'
import { isAllowedPhotoUrl } from './photos'

describe('normalizeInstagram', () => {
  it.each([
    ['@Rondje.App', 'rondje.app'],
    ['https://www.instagram.com/dierenopvang_utrecht/', 'dierenopvang_utrecht'],
    ['instagram.com/x?igsh=1', 'x'],
    ['', null],
    ['not a handle!', null],
  ])('%s → %s', (input, expected) => expect(normalizeInstagram(input)).toBe(expected))
})

describe('normalizeWebsite', () => {
  it('adds https and rejects non-addresses', () => {
    expect(normalizeWebsite('opvang.nl')).toBe('https://opvang.nl/')
    expect(normalizeWebsite('http://opvang.be/honden')).toBe('http://opvang.be/honden')
    expect(normalizeWebsite('javascript:alert(1)')).toBeNull()
    expect(normalizeWebsite('localhost')).toBeNull()
  })
})

describe('isAllowedPhotoUrl', () => {
  it('only accepts our own uploads', () => {
    expect(isAllowedPhotoUrl('https://abc.public.blob.vercel-storage.com/photos/x.jpg')).toBe(true)
    expect(isAllowedPhotoUrl('data:image/jpeg;base64,AAAA')).toBe(true)
    expect(isAllowedPhotoUrl('https://evil.example/x.jpg')).toBe(false)
    expect(isAllowedPhotoUrl('data:text/html;base64,AAAA')).toBe(false)
  })
})

describe('readOrgForm', () => {
  it('fills defaults for the optional intake fields', () => {
    const form = new FormData()
    for (const [k, v] of Object.entries({ name: 'Opvang', country: 'BE', city: 'Gent', registrationNumber: '0123456', email: 'a@b.be' })) form.set(k, v)
    const parsed = readOrgForm(form)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.treatsPolicy).toBe('own')
      expect(parsed.data.provides).toEqual([])
      expect(parsed.data.defaultWalkMinutes).toBe(45)
      expect(parsed.data.dogCount).toBeUndefined()
    }
  })

  it('rejects a coordinator e-mail that is not an e-mail', () => {
    const form = new FormData()
    for (const [k, v] of Object.entries({ name: 'Opvang', country: 'NL', city: 'X', registrationNumber: '12345678', email: 'a@b.nl', coordinatorEmail: 'nope' })) form.set(k, v)
    expect(readOrgForm(form).success).toBe(false)
  })
})

describe('registryLookupUrl', () => {
  it('links Dutch and Belgian numbers to the public register', () => {
    expect(registryLookupUrl('NL', '1234 5678')).toBe('https://www.kvk.nl/zoeken/?source=all&q=12345678')
    expect(registryLookupUrl('BE', '0123.456.789')).toContain('nummer=0123456789')
    expect(registryLookupUrl('BE', '123.456.789')).toContain('nummer=0123456789')
    expect(registryLookupUrl('ES', 'G12345678')).toBeNull()
    expect(registryLookupUrl('NL', '123')).toBeNull()
  })
})

describe('emailMatchesWebsite', () => {
  it('compares the email domain with the website', () => {
    expect(emailMatchesWebsite('info@opvang.nl', 'https://www.opvang.nl/')).toBe(true)
    expect(emailMatchesWebsite('info@mail.opvang.nl', 'https://opvang.nl/')).toBe(true)
    expect(emailMatchesWebsite('opvang@gmail.com', 'https://opvang.nl/')).toBe(false)
    expect(emailMatchesWebsite(null, 'https://opvang.nl/')).toBe(false)
    expect(emailMatchesWebsite('info@opvang.nl', null)).toBe(false)
  })
})
