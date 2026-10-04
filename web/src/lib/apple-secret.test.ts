import { generateKeyPairSync, verify } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { APPLE_SECRET_MAX_SECONDS, appleClientSecret, jwtExpiry, parseApplePrivateKey, signAppleClientSecret } = await import('./apple-secret')

// A throwaway key shaped like Apple's AuthKey_….p8: PKCS#8, P-256.
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const P8 = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
const NOW = new Date('2026-10-05T12:00:00Z')
const ENV = { APPLE_CLIENT_ID: 'app.rondje.web', APPLE_KEY_ID: 'KEY1234567', APPLE_TEAM_ID: 'TEAM123456' }

function decode(token: string) {
  const [header, payload, signature] = token.split('.')
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString()),
    payload: JSON.parse(Buffer.from(payload, 'base64url').toString()),
    valid: verify('sha256', Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')),
  }
}

describe('Apple client secret', () => {
  it('signs a secret Apple accepts: ES256, team as issuer, Services ID as subject', () => {
    const result = appleClientSecret({ ...ENV, APPLE_PRIVATE_KEY: P8 }, NOW)
    expect(result.source).toBe('key')
    expect(result.problem).toBeUndefined()
    const { header, payload, valid } = decode(result.secret!)
    expect(valid).toBe(true)
    expect(header).toEqual({ alg: 'ES256', kid: 'KEY1234567', typ: 'JWT' })
    expect(payload).toMatchObject({ iss: 'TEAM123456', sub: 'app.rondje.web', aud: 'https://appleid.apple.com' })
    expect(payload.iat).toBe(NOW.getTime() / 1000)
    // Within Apple's limit of about six months, and the expiry matches the token.
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(APPLE_SECRET_MAX_SECONDS)
    expect(payload.exp - payload.iat).toBeGreaterThan(150 * 24 * 60 * 60)
    expect(result.expiresAt?.getTime()).toBe(payload.exp * 1000)
  })

  it('never signs for longer than Apple allows', () => {
    const { secret } = signAppleClientSecret({ ...{ teamId: 'T', keyId: 'K', clientId: 'C' }, key: privateKey, now: NOW, lifetimeSeconds: 10 ** 9 })
    const { payload } = decode(secret)
    expect(payload.exp - payload.iat).toBe(APPLE_SECRET_MAX_SECONDS)
  })

  it('reads the .p8 key however it was pasted into Vercel', () => {
    const body = P8.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '')
    const pasted = [
      P8,
      P8.replace(/\n/g, '\\n'), // one line with \n in it
      P8.replace(/\n/g, ' '), // one line with spaces
      Buffer.from(P8).toString('base64'), // the whole file base64-encoded
      body, // only the lines between BEGIN and END
      `\n  ${P8}  \n`,
    ]
    for (const value of pasted) {
      const result = appleClientSecret({ ...ENV, APPLE_PRIVATE_KEY: value }, NOW)
      expect(result.source, JSON.stringify(value.slice(0, 40))).toBe('key')
      expect(decode(result.secret!).valid).toBe(true)
    }
  })

  it('refuses keys that are not Apple keys', () => {
    const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
    const otherCurve = generateKeyPairSync('ec', { namedCurve: 'secp384r1' }).privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
    for (const value of [rsa, otherCurve, 'not a key', 'AuthKey_KEY1234567.p8']) {
      expect(() => parseApplePrivateKey(value)).toThrow()
    }
  })

  it('falls back to a ready-made APPLE_CLIENT_SECRET, and says why', () => {
    const ready = signAppleClientSecret({ teamId: 'T', keyId: 'K', clientId: 'C', key: privateKey, now: NOW }).secret
    expect(appleClientSecret({ ...ENV, APPLE_CLIENT_SECRET: ready }, NOW)).toMatchObject({ secret: ready, source: 'env', problem: undefined })
    expect(appleClientSecret({ ...ENV, APPLE_CLIENT_SECRET: ready }, NOW).expiresAt).toEqual(jwtExpiry(ready))
    // A broken key: the ready-made secret still works, and the log gets a line.
    expect(appleClientSecret({ ...ENV, APPLE_PRIVATE_KEY: 'oops', APPLE_CLIENT_SECRET: ready }, NOW)).toMatchObject({
      secret: ready,
      source: 'env',
      problem: 'invalid-key',
    })
    // A key without its Key ID or Team ID cannot be used.
    expect(appleClientSecret({ APPLE_CLIENT_ID: 'app.rondje.web', APPLE_PRIVATE_KEY: P8, APPLE_TEAM_ID: 'TEAM123456' }, NOW)).toEqual({
      secret: null,
      source: null,
      expiresAt: null,
      problem: 'incomplete-key',
    })
  })

  it('stays off without a Services ID or anything to sign with', () => {
    expect(appleClientSecret({}, NOW).secret).toBeNull()
    expect(appleClientSecret({ APPLE_PRIVATE_KEY: P8, APPLE_KEY_ID: 'K', APPLE_TEAM_ID: 'T' }, NOW).secret).toBeNull()
    expect(appleClientSecret({ APPLE_CLIENT_ID: 'app.rondje.web' }, NOW)).toEqual({ secret: null, source: null, expiresAt: null, problem: undefined })
    expect(appleClientSecret({ ...ENV, APPLE_PRIVATE_KEY: 'oops' }, NOW)).toMatchObject({ secret: null, problem: 'invalid-key' })
  })

  it('reads the expiry of a JWT, and nothing from other strings', () => {
    expect(jwtExpiry('test-apple-secret')).toBeNull()
    expect(jwtExpiry('a.b.c')).toBeNull()
    const exp = 1_800_000_000
    expect(jwtExpiry(`x.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.y`)).toEqual(new Date(exp * 1000))
  })
})
