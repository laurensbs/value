import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The three ways to "Help ons" in the app shell, rendered as the server does for an app request:
// the row at the bottom of the profile, the footer link and the block on the home page. They follow
// SUPPORT_IN_APP and the per-app switches (lib/support.ts); the website never changes.

// The request (the user agent of the app or browser, and the header the native iPhone app sends)
// and the campaign numbers (content/crowdfunding.json), changed per test.
const request = vi.hoisted(() => ({ userAgent: '', platform: null as string | null }))
const drive = vi.hoisted(() => ({ goal: 3000, raised: 0, shareToCausesPercent: 10, updated: '2026-10-05' }))

vi.mock('server-only', () => ({}))
vi.mock('../../content/crowdfunding.json', () => ({ default: drive }))
vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers({ 'user-agent': request.userAgent, ...(request.platform ? { 'x-rondje-platform': request.platform } : {}) }),
}))
// next-intl's request helpers, with the real Dutch messages.
vi.mock('next-intl/server', async () => {
  const { createFormatter, createTranslator } = await import('next-intl')
  const { default: messages } = await import('../../messages/nl.json')
  const namespaceOf = (arg?: string | { namespace?: string }) => (typeof arg === 'string' ? arg : arg?.namespace)
  return {
    getTranslations: async (arg?: string | { namespace?: string }) => createTranslator({ locale: 'nl', messages, namespace: namespaceOf(arg) as never }),
    getFormatter: async () => createFormatter({ locale: 'nl', timeZone: 'Europe/Amsterdam' }),
  }
})

const { HelpUsFooterLink, HelpUsRow } = await import('./HelpUsInApp')
const { HelpUs } = await import('./landing/HelpUs')

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 RondjeApp',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 RondjeApp',
}
const CAMPAIGN = 'https://whydonate.com/nl/fundraising/rondjemee'

/** What each of the three renders for the current request: HTML, or null when it is left out. */
async function entries(native = true) {
  const html = (el: ReactElement | null) => (el ? renderToStaticMarkup(el) : null)
  return {
    row: html(await HelpUsRow({ native })),
    footer: html(await HelpUsFooterLink({ native })),
    home: html(await HelpUs({ native })),
  }
}

beforeEach(() => {
  vi.stubEnv('CROWDFUNDING_URL', CAMPAIGN)
  vi.stubEnv('OPERATOR_NAME', 'Laurens Bos')
  for (const name of ['SUPPORT_IN_APP', 'SUPPORT_IN_APP_IOS', 'SUPPORT_IN_APP_ANDROID']) vi.stubEnv(name, undefined)
  request.userAgent = UA.iphone
  request.platform = null
  drive.raised = 0
})
afterEach(() => vi.unstubAllEnvs())

describe('"Help ons" in the app shell', () => {
  it('shows the row, the footer link and the home block, each a plain link out to the campaign', async () => {
    const { row, footer, home } = await entries()
    for (const html of [row, footer, home]) {
      expect(html).toContain(`href="${CAMPAIGN}"`)
      expect(html).toContain('target="_blank"')
    }
    expect(row).toContain('Help ons via Whydonate')
    expect(footer).toContain('Help ons via Whydonate')
    expect(row).toContain('opent Whydonate in je browser')
  })

  it('SUPPORT_IN_APP=0 hides the profile row, the footer link and the home block', async () => {
    vi.stubEnv('SUPPORT_IN_APP', '0')
    for (const ua of [UA.iphone, UA.android]) {
      request.userAgent = ua
      expect(await entries()).toEqual({ row: null, footer: null, home: null })
    }
  })

  it('a typo in SUPPORT_IN_APP hides them too', async () => {
    vi.stubEnv('SUPPORT_IN_APP', 'nee')
    expect(await entries()).toEqual({ row: null, footer: null, home: null })
  })

  it('SUPPORT_IN_APP_IOS=0 hides them in the iPhone app and keeps them in the Android app', async () => {
    vi.stubEnv('SUPPORT_IN_APP_IOS', '0')
    expect(await entries()).toEqual({ row: null, footer: null, home: null })
    request.userAgent = UA.android
    const android = await entries()
    expect(android.row).toContain(CAMPAIGN)
    expect(android.footer).toContain(CAMPAIGN)
    expect(android.home).toContain(CAMPAIGN)
  })

  it('SUPPORT_IN_APP_ANDROID=0 hides them in the Android app and keeps them on the iPhone', async () => {
    vi.stubEnv('SUPPORT_IN_APP_ANDROID', '0')
    expect((await entries()).row).toContain(CAMPAIGN)
    request.userAgent = UA.android
    expect(await entries()).toEqual({ row: null, footer: null, home: null })
  })

  it('the website never changes: no row or footer link there, and the home block stays', async () => {
    vi.stubEnv('SUPPORT_IN_APP', '0')
    request.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
    const web = await entries(false)
    expect(web.row).toBeNull()
    expect(web.footer).toBeNull()
    expect(web.home).toContain(CAMPAIGN)
  })

  it('before anything came in: the goal in rounds, never "€ 0 van € 3.000"', async () => {
    const { row, home } = await entries()
    expect(row).toMatch(/Geef een rondje vanaf €\s?5 · Doel: 600 rondjes/)
    expect(home).toContain('Doel: 600 rondjes')
    for (const html of [row, home]) {
      expect(html).not.toMatch(/€\s?0\b/)
      expect(html).not.toContain('opgehaald')
      expect(html).not.toContain('role="progressbar"')
    }
  })

  it('once something came in: the amount raised next to the goal', async () => {
    drive.raised = 120
    const { row, home } = await entries()
    expect(row).toMatch(/Geef een rondje vanaf €\s?5 · €\s?120 van €\s?3\.000/)
    expect(row).not.toContain('Doel:')
    expect(home).toMatch(/€\s?120 van €\s?3\.000 opgehaald/)
    expect(home).toContain('role="progressbar"')
  })

  it('the native iPhone app is the iPhone, by its header', async () => {
    vi.stubEnv('SUPPORT_IN_APP_IOS', '0')
    request.userAgent = 'RondjeApp/1 iOS'
    request.platform = 'ios'
    expect((await entries()).row).toBeNull()
    vi.stubEnv('SUPPORT_IN_APP_IOS', 'aan')
    expect((await entries()).row).toContain(CAMPAIGN)
  })

  it('in the app the home block does not promise the App Store and Google Play', async () => {
    const { home } = await entries()
    expect(home).toContain('Met jouw rondje blijft Rondje Mee gratis en is het eerste jaar betaald.')
    expect(home).not.toMatch(/App Store|Google Play/)
    const web = await entries(false)
    expect(web.home).toContain('App Store')
  })
})
