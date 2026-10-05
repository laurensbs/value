import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The two ways to "Help ons" in the app shell, rendered as the server does for an app request: the
// row low in the profile and the block at the bottom of the home page. There is no footer link in the
// apps (components/Footer.tsx; e2e/help-app.spec.ts). Both follow SUPPORT_IN_APP and the per-app
// switches (lib/support.ts); the website never changes.

// The request (the user agent of the app or browser, and the header the native iPhone app sends)
// and the campaign numbers (content/crowdfunding.json), changed per test.
const request = vi.hoisted(() => ({ userAgent: '', platform: null as string | null }))
const drive = vi.hoisted(() => ({ goal: 3000, raised: 0, shareToCausesPercent: 10, updated: '2026-10-05' }))
// The language of the request.
const lang = vi.hoisted(() => ({ locale: 'nl' as 'nl' | 'en' | 'es' | 'fr' }))

vi.mock('server-only', () => ({}))
vi.mock('../../content/crowdfunding.json', () => ({ default: drive }))
vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers({ 'user-agent': request.userAgent, ...(request.platform ? { 'x-rondje-platform': request.platform } : {}) }),
}))
// next-intl's request helpers, with the real messages.
vi.mock('next-intl/server', async () => {
  const { createFormatter, createTranslator } = await import('next-intl')
  const all = {
    nl: (await import('../../messages/nl.json')).default,
    en: (await import('../../messages/en.json')).default,
    es: (await import('../../messages/es.json')).default,
    fr: (await import('../../messages/fr.json')).default,
  }
  const namespaceOf = (arg?: string | { namespace?: string }) => (typeof arg === 'string' ? arg : arg?.namespace)
  return {
    getTranslations: async (arg?: string | { namespace?: string }) =>
      createTranslator({ locale: lang.locale, messages: all[lang.locale] as never, namespace: namespaceOf(arg) as never }),
    getFormatter: async () => createFormatter({ locale: lang.locale, timeZone: 'Europe/Amsterdam' }),
  }
})

const { HelpUsRow } = await import('./HelpUsInApp')
const { HelpUs } = await import('./landing/HelpUs')

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 RondjeApp',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 RondjeApp',
}
const CAMPAIGN = 'https://whydonate.com/nl/fundraising/rondjemee'

/** What each of the two renders for the current request: HTML, or null when it is left out. */
async function entries(native = true) {
  const html = (el: ReactElement | null) => (el ? renderToStaticMarkup(el) : null)
  return {
    row: html(await HelpUsRow({ native })),
    home: html(await HelpUs({ native })),
  }
}

/** The visible text, with the formatters' no-break spaces as plain ones. */
const text = (html: string | null) =>
  (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')

beforeEach(() => {
  vi.stubEnv('CROWDFUNDING_URL', CAMPAIGN)
  vi.stubEnv('OPERATOR_NAME', 'Laurens Bos')
  for (const name of ['SUPPORT_IN_APP', 'SUPPORT_IN_APP_IOS', 'SUPPORT_IN_APP_ANDROID']) vi.stubEnv(name, undefined)
  request.userAgent = UA.iphone
  request.platform = null
  drive.raised = 0
  lang.locale = 'nl'
})
afterEach(() => vi.unstubAllEnvs())

describe('"Help ons" in the app shell', () => {
  it('shows the row and the home block, each a plain link out to the campaign', async () => {
    const { row, home } = await entries()
    for (const html of [row, home]) {
      expect(html).toContain(`href="${CAMPAIGN}"`)
      expect(html).toContain('target="_blank"')
    }
    expect(row).toContain('Help ons via Whydonate')
    expect(row).toContain('opent Whydonate in je browser')
  })

  it('SUPPORT_IN_APP=0 hides the profile row and the home block', async () => {
    vi.stubEnv('SUPPORT_IN_APP', '0')
    for (const ua of [UA.iphone, UA.android]) {
      request.userAgent = ua
      expect(await entries()).toEqual({ row: null, home: null })
    }
  })

  it('a typo in SUPPORT_IN_APP hides them too', async () => {
    vi.stubEnv('SUPPORT_IN_APP', 'nee')
    expect(await entries()).toEqual({ row: null, home: null })
  })

  it('SUPPORT_IN_APP_IOS=0 hides them in the iPhone app and keeps them in the Android app', async () => {
    vi.stubEnv('SUPPORT_IN_APP_IOS', '0')
    expect(await entries()).toEqual({ row: null, home: null })
    request.userAgent = UA.android
    const android = await entries()
    expect(android.row).toContain(CAMPAIGN)
    expect(android.home).toContain(CAMPAIGN)
  })

  it('SUPPORT_IN_APP_ANDROID=0 hides them in the Android app and keeps them on the iPhone', async () => {
    vi.stubEnv('SUPPORT_IN_APP_ANDROID', '0')
    expect((await entries()).row).toContain(CAMPAIGN)
    request.userAgent = UA.android
    expect(await entries()).toEqual({ row: null, home: null })
  })

  it('the website never changes: no row there, and the home block stays', async () => {
    vi.stubEnv('SUPPORT_IN_APP', '0')
    request.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
    const web = await entries(false)
    expect(web.row).toBeNull()
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

  it('in English, Spanish and French the goal is in euros and the gift "from €5", never a price per walk', async () => {
    const expected = {
      en: { from: 'From €5', goal: 'Goal: €3,000', progress: '1% of the way' },
      es: { from: 'Desde 5 €', goal: 'Objetivo: 3000 €', progress: '1 % del camino' },
      fr: { from: 'Dès 5 €', goal: 'Objectif : 3 000 €', progress: '1 % du chemin' },
    } as const
    for (const locale of ['en', 'es', 'fr'] as const) {
      lang.locale = locale
      drive.raised = 0
      const before = await entries()
      expect(text(before.row), locale).toContain(`${expected[locale].from} · ${expected[locale].goal}`)
      expect(text(before.home), locale).toContain(expected[locale].goal)
      expect(text(before.home), locale).toContain(expected[locale].from)
      drive.raised = 45
      const after = await entries()
      expect(text(after.home), locale).toContain(expected[locale].progress)
      for (const html of [before.row, before.home, after.row, after.home]) {
        expect(text(html), locale).not.toMatch(/\b(rounds?|paseos?|balades?)\b|=\s*1\b|\b600\b/i)
      }
    }
  })

  it('in Dutch the pun stays: "Geef een rondje", the goal in rondjes and €5 = 1 rondje', async () => {
    const { row, home } = await entries()
    expect(text(row)).toContain('Geef een rondje vanaf € 5 · Doel: 600 rondjes')
    expect(text(home)).toContain('€ 5 = 1 rondje')
    drive.raised = 120
    expect(text((await entries()).home)).toContain('24 van de 600 rondjes')
  })
})
