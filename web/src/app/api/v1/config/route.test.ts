import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// GET /api/v1/config: `support.inApp` follows the switch of the app that asks.

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth', () => ({ appleNativeEnabled: false, enabledSocialProviders: [] }))
vi.mock('@/server/api', () => ({ json: (body: unknown) => Response.json(body) }))
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string, values?: { platform?: string }) => (key === 'label' ? `Help ons via ${values?.platform}` : key),
}))

const { GET } = await import('./route')

const CAMPAIGN = 'https://whydonate.com/nl/fundraising/rondjemee'
const NATIVE_IOS = { 'user-agent': 'RondjeApp/1 iOS', 'x-rondje-platform': 'ios' }
const ANDROID_SHELL = { 'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 RondjeApp' }

async function support(headers: Record<string, string>) {
  const res = await GET(new Request('https://rondjemee.nl/api/v1/config', { headers }))
  return ((await res.json()) as { support?: { inApp: boolean; crowdfundingUrl: string } }).support
}

beforeEach(() => {
  vi.stubEnv('CROWDFUNDING_URL', CAMPAIGN)
  vi.stubEnv('OPERATOR_NAME', 'Laurens Bos')
  for (const name of ['SUPPORT_IN_APP', 'SUPPORT_IN_APP_IOS', 'SUPPORT_IN_APP_ANDROID']) vi.stubEnv(name, undefined)
})
afterEach(() => vi.unstubAllEnvs())

describe('GET /api/v1/config', () => {
  it('sends the campaign to every app while the switches are unset', async () => {
    expect(await support(NATIVE_IOS)).toMatchObject({ inApp: true, crowdfundingUrl: CAMPAIGN, label: 'Help ons via Whydonate' })
    expect((await support(ANDROID_SHELL))?.inApp).toBe(true)
  })

  it('SUPPORT_IN_APP_IOS=0 turns it off for the iPhone app, by its header or its user agent', async () => {
    vi.stubEnv('SUPPORT_IN_APP_IOS', '0')
    expect((await support(NATIVE_IOS))?.inApp).toBe(false)
    expect((await support({ 'user-agent': 'RondjeApp/1 iOS' }))?.inApp).toBe(false)
    expect((await support(ANDROID_SHELL))?.inApp).toBe(true)
  })

  it('SUPPORT_IN_APP=0 turns it off everywhere unless an app has its own switch on', async () => {
    vi.stubEnv('SUPPORT_IN_APP', '0')
    expect((await support(NATIVE_IOS))?.inApp).toBe(false)
    expect((await support(ANDROID_SHELL))?.inApp).toBe(false)
    expect((await support({}))?.inApp).toBe(false)
    vi.stubEnv('SUPPORT_IN_APP_ANDROID', '1')
    expect((await support(ANDROID_SHELL))?.inApp).toBe(true)
  })

  it('leaves `support` out while there is no campaign with a named recipient', async () => {
    vi.stubEnv('OPERATOR_NAME', undefined)
    expect(await support(NATIVE_IOS)).toBeUndefined()
  })
})
