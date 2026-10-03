import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  appCallbackURL,
  codeIdentifier,
  flowIdentifier,
  isValidChallenge,
  mapProviderError,
  randomCode,
  sha256Base64Url,
  verifierMatches,
} from './handoff'

// The full flow (start → finish → exchange against a real Better Auth instance) is in
// src/lib/auth.test.ts; these are the building blocks.

describe('native handoff helpers', () => {
  it('makes 32-byte, URL-safe codes that never repeat', () => {
    const codes = new Set(Array.from({ length: 200 }, randomCode))
    expect(codes.size).toBe(200)
    for (const code of codes) {
      expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(Buffer.from(code, 'base64url')).toHaveLength(32)
    }
  })

  it('stores codes and flows only as a hash, under their own prefix', () => {
    const code = randomCode()
    expect(codeIdentifier(code)).toBe(`rondje-native-code:${sha256Base64Url(code)}`)
    expect(codeIdentifier(code)).not.toContain(code)
    expect(flowIdentifier(code)).not.toBe(codeIdentifier(code))
  })

  it('only ever redirects to the fixed app address', () => {
    expect(appCallbackURL({ code: 'abc_-123' })).toBe('rondje://auth/callback?code=abc_-123')
    expect(appCallbackURL({ error: 'cancelled' })).toBe('rondje://auth/callback?error=cancelled')
    // Whatever ends up in a value stays a value.
    expect(appCallbackURL({ code: 'x&error=1#https://evil.example' })).toBe(
      'rondje://auth/callback?code=x%26error%3D1%23https%3A%2F%2Fevil.example',
    )
  })

  it('maps provider errors onto short codes for the app', () => {
    expect(mapProviderError('access_denied')).toBe('cancelled')
    expect(mapProviderError('user_cancelled_authorize')).toBe('cancelled')
    expect(mapProviderError('account_not_linked')).toBe('account-not-linked')
    expect(mapProviderError('state_mismatch')).toBe('sign-in-failed')
    expect(mapProviderError('<script>')).toBe('sign-in-failed')
  })

  it('checks PKCE (S256) like RFC 7636', () => {
    // RFC 7636 appendix B.
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    expect(createHash('sha256').update(verifier).digest('base64url')).toBe(challenge)
    expect(isValidChallenge(challenge)).toBe(true)
    expect(verifierMatches(challenge, verifier)).toBe(true)
    expect(verifierMatches(challenge, `${verifier}x`)).toBe(false)
    expect(verifierMatches(challenge, undefined)).toBe(false)
    expect(verifierMatches(challenge, 'short')).toBe(false)
    expect(isValidChallenge('plain-text')).toBe(false)
    expect(isValidChallenge(`${challenge}=`)).toBe(false)
  })
})
