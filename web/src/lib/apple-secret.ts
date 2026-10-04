import 'server-only'
import { createPrivateKey, sign, type KeyObject } from 'node:crypto'

/**
 * The client secret for "Inloggen met Apple" on the website.
 *
 * Apple wants a short JWT signed with the .p8 key from the Apple Developer account, and accepts
 * one for at most about six months. With APPLE_PRIVATE_KEY + APPLE_KEY_ID + APPLE_TEAM_ID the
 * server signs a fresh one every time it starts, so it never runs out. A ready-made
 * APPLE_CLIENT_SECRET (scripts/apple-client-secret.mjs) still works, but has to be renewed by hand.
 */

/** Apple: no more than 15,777,000 seconds (about 6 months). */
export const APPLE_SECRET_MAX_SECONDS = 15_777_000
/** 180 days: below Apple's limit. A server instance never lives that long. */
export const APPLE_SECRET_LIFETIME_SECONDS = 180 * 24 * 60 * 60

/** process.env, or just the APPLE_* part of it. */
export interface AppleSecretEnv {
  [name: string]: string | undefined
  APPLE_CLIENT_ID?: string
  APPLE_CLIENT_SECRET?: string
  APPLE_PRIVATE_KEY?: string
  APPLE_KEY_ID?: string
  APPLE_TEAM_ID?: string
}

export type AppleSecretProblem = 'incomplete-key' | 'invalid-key'

export interface AppleSecret {
  /** The client secret to give Better Auth, or null when Apple stays off on the website. */
  secret: string | null
  /** 'key': signed here from the .p8 key; 'env': the ready-made APPLE_CLIENT_SECRET. */
  source: 'key' | 'env' | null
  /** When the secret stops working (null: unknown, e.g. not a JWT). */
  expiresAt: Date | null
  /** Set when a .p8 key was given but could not be used; worth a line in the server log. */
  problem?: AppleSecretProblem
}

const PEM = /-----BEGIN [A-Z ]*PRIVATE KEY-----([\s\S]*?)-----END [A-Z ]*PRIVATE KEY-----/

/**
 * The .p8 key as it was pasted into Vercel: the file itself, the file on one line with "\n" in
 * it, the file base64-encoded, or only the lines between BEGIN and END. Apple keys are PKCS#8
 * on the P-256 curve; anything else is refused.
 */
export function parseApplePrivateKey(raw: string): KeyObject {
  let text = raw.trim().replace(/\\n/g, '\n')
  if (!text.includes('-----BEGIN')) {
    const decoded = Buffer.from(text, 'base64').toString('utf8')
    if (decoded.includes('-----BEGIN')) text = decoded
  }
  const body = (PEM.exec(text)?.[1] ?? text).replace(/\s+/g, '')
  if (!body || !/^[A-Za-z0-9+/=]+$/.test(body)) throw new Error('not a PEM private key')
  const pem = `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`
  const key = createPrivateKey(pem)
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
    throw new Error('not an Apple (P-256) key')
  }
  return key
}

/** The signed client secret: ES256, issued by the team, for this Services ID, for Apple. */
export function signAppleClientSecret(opts: {
  teamId: string
  keyId: string
  clientId: string
  key: KeyObject
  now?: Date
  lifetimeSeconds?: number
}): { secret: string; expiresAt: Date } {
  const iat = Math.floor((opts.now ?? new Date()).getTime() / 1000)
  const exp = iat + Math.min(opts.lifetimeSeconds ?? APPLE_SECRET_LIFETIME_SECONDS, APPLE_SECRET_MAX_SECONDS)
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned = `${encode({ alg: 'ES256', kid: opts.keyId, typ: 'JWT' })}.${encode({
    iss: opts.teamId,
    iat,
    exp,
    aud: 'https://appleid.apple.com',
    sub: opts.clientId,
  })}`
  // ES256 in a JWT is the raw r||s signature, not DER.
  const signature = sign('sha256', Buffer.from(unsigned), { key: opts.key, dsaEncoding: 'ieee-p1363' }).toString('base64url')
  return { secret: `${unsigned}.${signature}`, expiresAt: new Date(exp * 1000) }
}

/** The `exp` of a JWT, without checking anything else; null when it is not a JWT. */
export function jwtExpiry(token: string): Date | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const exp = (JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown }).exp
    return typeof exp === 'number' ? new Date(exp * 1000) : null
  } catch {
    return null
  }
}

/**
 * Which secret to use. The .p8 key wins (it never runs out); a broken or half-set key falls back
 * to APPLE_CLIENT_SECRET when there is one. Without APPLE_CLIENT_ID there is nothing to sign for.
 */
export function appleClientSecret(env: AppleSecretEnv, now: Date = new Date()): AppleSecret {
  const clientId = env.APPLE_CLIENT_ID?.trim()
  if (!clientId) return { secret: null, source: null, expiresAt: null }

  let problem: AppleSecretProblem | undefined
  const rawKey = env.APPLE_PRIVATE_KEY?.trim()
  if (rawKey) {
    const keyId = env.APPLE_KEY_ID?.trim()
    const teamId = env.APPLE_TEAM_ID?.trim()
    if (!keyId || !teamId) {
      problem = 'incomplete-key'
    } else {
      try {
        const signed = signAppleClientSecret({ teamId, keyId, clientId, key: parseApplePrivateKey(rawKey), now })
        return { ...signed, source: 'key' }
      } catch {
        problem = 'invalid-key'
      }
    }
  }

  const ready = env.APPLE_CLIENT_SECRET?.trim()
  if (ready) return { secret: ready, source: 'env', expiresAt: jwtExpiry(ready), problem }
  return { secret: null, source: null, expiresAt: null, problem }
}
