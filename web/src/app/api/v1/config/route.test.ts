import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// GET /api/v1/config: `support.inApp` follows the switch of the app that asks.

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth', () => ({ appleNativeEnabled: false, enabledSocialProviders: [] }))
vi.mock('@/server/api', () => ({ json: (body: unknown) => Response.json(body) }))
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string, values?: { platform?: string }) => (key === 'label' ? `Help ons via ${values?.platform}` : key),
}))

const { GET } = await import('./route')
const { TERMS_VERSION } = await import('@/lib/site')

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
  for (const name of ['SUPPORT_IN_APP', 'SUPPORT_IN_APP_IOS', 'SUPPORT_IN_APP_ANDROID', 'LIVE_LOCATION', 'TEST_CLOCK', 'VERCEL_ENV']) vi.stubEnv(name, undefined)
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

describe('GET /api/v1/config: live location and the terms', () => {
  async function config(headers: Record<string, string> = NATIVE_IOS) {
    const res = await GET(new Request('https://rondjemee.nl/api/v1/config', { headers }))
    return (await res.json()) as { features: { liveLocation: boolean }; terms: { version: string; effectiveAt: string } }
  }

  it('says live location is on while LIVE_LOCATION is unset, and off when it says so', async () => {
    expect((await config()).features).toEqual({ liveLocation: true })
    vi.stubEnv('LIVE_LOCATION', '0')
    expect((await config()).features).toEqual({ liveLocation: false })
    vi.stubEnv('LIVE_LOCATION', 'aan')
    expect((await config()).features).toEqual({ liveLocation: true })
  })

  it('lets only a test server switch it off for one app, never production', async () => {
    const off = { ...NATIVE_IOS, 'x-rondje-live-location': 'off' }
    expect((await config(off)).features.liveLocation).toBe(true)
    vi.stubEnv('TEST_CLOCK', '1')
    expect((await config(off)).features.liveLocation).toBe(false)
    vi.stubEnv('VERCEL_ENV', 'production')
    expect((await config(off)).features.liveLocation).toBe(true)
  })

  it('names the current terms and the moment they take effect', async () => {
    const { terms } = await config()
    expect(terms.version).toBe(TERMS_VERSION)
    expect(new Date(terms.effectiveAt).toISOString()).toBe(terms.effectiveAt)
  })
})
