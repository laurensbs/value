import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ after: (fn: () => unknown) => void fn() }))
vi.mock('next-intl/server', () => ({
  getTranslations: async () => Object.assign((key: string, v?: Record<string, string>) => `${key}|${v?.senderName ?? ''}|${v?.dogName ?? ''}`, { has: () => true }),
}))
vi.mock('@/db', () => ({ getDb: async () => ({}) }))

const { apnsJwt, pushMessage, webPushKey } = await import('./push')

describe('push', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('stays off until both VAPID keys are set', () => {
    vi.stubEnv('VAPID_PUBLIC_KEY', 'pub')
    vi.stubEnv('VAPID_PRIVATE_KEY', '')
    expect(webPushKey()).toBeNull()
    vi.stubEnv('VAPID_PRIVATE_KEY', 'priv')
    expect(webPushKey()).toBe('pub')
  })

  it('builds the message with a link and one tag per conversation', async () => {
    const m = await pushMessage('chat-message', { requestId: 'r1', dogName: 'Bello', senderName: 'Ans' }, 'nl')
    expect(m.body).toBe('kinds.chat-message|Ans|Bello')
    expect(m.url).toBe('/chat/r1')
    expect(m.tag).toBe('chat-message:r1')
    const group = await pushMessage('group-walk-reminder', { groupWalkId: 'g1', orgName: 'Opvang', day: 'tomorrow', time: '10:00' }, 'nl')
    expect(group.url).toBe('/group-walks')
    expect(group.tag).toBe('group-walk-reminder:g1')
  })

  it('signs an APNs token Apple can verify (ES256, raw signature)', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    vi.stubEnv('APNS_KEY_ID', 'KEY123')
    vi.stubEnv('APNS_TEAM_ID', 'TEAM456')
    vi.stubEnv('APNS_PRIVATE_KEY', privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().replace(/\n/g, '\\n'))
    const jwt = apnsJwt(1_000_000_000_000)
    const [head, claims, sig] = jwt.split('.')
    expect(JSON.parse(Buffer.from(head, 'base64url').toString())).toEqual({ alg: 'ES256', kid: 'KEY123' })
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString())).toEqual({ iss: 'TEAM456', iat: 1_000_000_000 })
    const ok = verify('sha256', Buffer.from(`${head}.${claims}`), { key: createPublicKey(publicKey.export({ type: 'spki', format: 'pem' })), dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url'))
    expect(ok).toBe(true)
    // Reused within the hour.
    expect(apnsJwt(1_000_000_000_000 + 10 * 60_000)).toBe(jwt)
  })
})
