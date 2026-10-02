import { describe, expect, it } from 'vitest'
import { supportConfig, supportUrl } from './support'

describe('supportUrl', () => {
  it('accepts https links to known support platforms only', () => {
    expect(supportUrl('https://www.patreon.com/rondje')).toBe('https://www.patreon.com/rondje')
    expect(supportUrl('https://ko-fi.com/rondje')).toBe('https://ko-fi.com/rondje')
    expect(supportUrl('http://www.patreon.com/rondje')).toBeNull()
    expect(supportUrl('https://patreon.com.evil.example/rondje')).toBeNull()
    expect(supportUrl('javascript:alert(1)')).toBeNull()
    expect(supportUrl('')).toBeNull()
  })
})

describe('supportConfig', () => {
  it('hides everything that is not set', () => {
    expect(supportConfig({})).toEqual({ url: null, platform: null, operator: null, instagram: null, contactEmail: null })
  })

  it('only shows the support link when the recipient is named', () => {
    expect(supportConfig({ SUPPORT_URL: 'https://www.patreon.com/rondje' }).url).toBeNull()
    const full = supportConfig({
      SUPPORT_URL: 'https://www.patreon.com/rondje',
      OPERATOR_NAME: ' Webstability ',
      INSTAGRAM_HANDLE: '@Rondje.App',
      CONTACT_EMAIL: 'hallo@example.org',
    })
    expect(full).toEqual({
      url: 'https://www.patreon.com/rondje',
      platform: 'Patreon',
      operator: 'Webstability',
      instagram: 'rondje.app',
      contactEmail: 'hallo@example.org',
    })
  })

  it('ignores an invalid email address', () => {
    expect(supportConfig({ CONTACT_EMAIL: 'not an email' }).contactEmail).toBeNull()
  })
})
