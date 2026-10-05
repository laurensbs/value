import { describe, expect, it } from 'vitest'
import crowdfunding from '../../content/crowdfunding.json'
import { appPlatform } from './app-platform'
import { appSupport, campaign, showsRaised, supportInApp, supportInBothApps, switchOn } from './support'

const label = (platform: string) => `Help ons via ${platform}`
const LIVE = {
  CROWDFUNDING_URL: 'https://whydonate.com/nl/fundraising/rondjemee',
  OPERATOR_NAME: 'Laurens Bos',
}

// What the apps send: the Capacitor shells add "RondjeApp" to the phone's own user agent
// (capacitor.config.ts); the native iPhone app sends "RondjeApp/1 iOS" and X-Rondje-Platform: ios.
const UA = {
  iphoneShell: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 RondjeApp',
  ipadShell: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) RondjeApp',
  androidShell: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 RondjeApp',
  nativeIos: 'RondjeApp/1 iOS',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
}

describe('switchOn: one switch from Vercel, read safely', () => {
  it('unset or empty gives the default', () => {
    expect(switchOn(undefined, true)).toBe(true)
    expect(switchOn(undefined, false)).toBe(false)
    expect(switchOn('', true)).toBe(true)
    expect(switchOn('   ', false)).toBe(false)
  })

  it("'1', 'true', 'on', 'ja' and 'aan' are on, in any case and with spaces around", () => {
    for (const on of ['1', 'true', 'on', 'ja', 'aan', 'TRUE', ' On ', 'Ja', 'AAN']) expect(switchOn(on, false), on).toBe(true)
  })

  it('anything else is off, a typo included: a switch meant to be off never stays on', () => {
    for (const off of ['0', 'false', 'off', 'nee', 'uit', 'no', 'yes', '2', 'tru', 'aanzetten', ' 0 ']) expect(switchOn(off, true), off).toBe(false)
  })
})

describe('supportInApp: SUPPORT_IN_APP for both apps, _IOS and _ANDROID per app', () => {
  it('is on unless the server switches it off', () => {
    expect(supportInApp({})).toBe(true)
    expect(supportInApp({ SUPPORT_IN_APP: '1' })).toBe(true)
    expect(supportInApp({ SUPPORT_IN_APP: '' })).toBe(true)
    expect(supportInApp({ SUPPORT_IN_APP: '0' })).toBe(false)
    expect(supportInApp({ SUPPORT_IN_APP: ' 0 ' })).toBe(false)
    expect(supportInApp({ SUPPORT_IN_APP: 'false' })).toBe(false)
    expect(supportInApp({ SUPPORT_IN_APP: 'OFF' })).toBe(false)
    expect(supportInApp({ SUPPORT_IN_APP: 'nee' })).toBe(false)
  })

  it('each app follows SUPPORT_IN_APP until its own switch is set', () => {
    for (const app of ['ios', 'android'] as const) {
      expect(supportInApp({}, app)).toBe(true)
      expect(supportInApp({ SUPPORT_IN_APP: '0' }, app)).toBe(false)
      expect(supportInApp({ SUPPORT_IN_APP: 'aan' }, app)).toBe(true)
    }
  })

  it('SUPPORT_IN_APP_IOS=0 takes it out of the iPhone app only', () => {
    const env = { SUPPORT_IN_APP_IOS: '0' }
    expect(supportInApp(env, 'ios')).toBe(false)
    expect(supportInApp(env, 'android')).toBe(true)
    // When it is not clear which app asks, the shared switch decides.
    expect(supportInApp(env, null)).toBe(true)
    expect(supportInBothApps(env)).toBe(false)
  })

  it('SUPPORT_IN_APP_ANDROID=0 takes it out of the Android app only', () => {
    const env = { SUPPORT_IN_APP_ANDROID: 'uit' }
    expect(supportInApp(env, 'ios')).toBe(true)
    expect(supportInApp(env, 'android')).toBe(false)
  })

  it('a per-app switch can turn one app on while the shared switch is off', () => {
    const env = { SUPPORT_IN_APP: '0', SUPPORT_IN_APP_ANDROID: '1' }
    expect(supportInApp(env, 'ios')).toBe(false)
    expect(supportInApp(env, 'android')).toBe(true)
    expect(supportInApp(env)).toBe(false)
  })

  it('an empty per-app switch counts as unset, a typo as off', () => {
    expect(supportInApp({ SUPPORT_IN_APP: '0', SUPPORT_IN_APP_IOS: '' }, 'ios')).toBe(false)
    expect(supportInApp({ SUPPORT_IN_APP_IOS: 'of' }, 'ios')).toBe(false)
    expect(supportInBothApps({})).toBe(true)
  })
})

describe('appPlatform: which app asks', () => {
  it('reads the Capacitor shells from the user agent', () => {
    expect(appPlatform(UA.iphoneShell)).toBe('ios')
    expect(appPlatform(UA.ipadShell)).toBe('ios')
    expect(appPlatform(UA.androidShell)).toBe('android')
  })

  it('the native iPhone app names itself, by header and by user agent', () => {
    expect(appPlatform(UA.nativeIos, 'ios')).toBe('ios')
    expect(appPlatform(UA.nativeIos)).toBe('ios')
    expect(appPlatform(null, ' iOS ')).toBe('ios')
    expect(appPlatform(UA.windowsChrome, 'android')).toBe('android')
    // An unknown value in the header is ignored.
    expect(appPlatform(UA.androidShell, 'windows')).toBe('android')
  })

  it('a desktop browser is no app', () => {
    expect(appPlatform(UA.macSafari)).toBeNull()
    expect(appPlatform(UA.windowsChrome)).toBeNull()
    expect(appPlatform('')).toBeNull()
    expect(appPlatform(undefined)).toBeNull()
  })
})

describe('showsRaised: the amount only once something came in', () => {
  it('shows "€X van €3.000" from the first euro, before that only the goal', () => {
    expect(showsRaised(campaign({ goal: 3000, raised: 0 }).progress)).toBe(false)
    expect(showsRaised(campaign({ goal: 3000, raised: 5 }).progress)).toBe(true)
    expect(showsRaised(campaign({ goal: 3000, raised: null }).progress)).toBe(false)
    expect(showsRaised(null)).toBe(false)
  })
})

describe('appSupport', () => {
  it('gives the apps the campaign link, the recipient and the numbers', () => {
    expect(appSupport(LIVE, { goal: 3000, raised: 1250, shareToCausesPercent: 10, updated: '2026-10-05' }, label)).toEqual({
      inApp: true,
      label: 'Help ons via Whydonate',
      crowdfundingUrl: 'https://whydonate.com/nl/fundraising/rondjemee',
      platform: 'Whydonate',
      operator: 'Laurens Bos',
      goal: 3000,
      raised: 1250,
      // "Geef een rondje": €5 a round, so €3,000 is 600 rounds.
      rounds: { goal: 600, raised: 250 },
      shareToCausesPercent: 10,
    })
  })

  it('says inApp: false when SUPPORT_IN_APP=0, so the apps hide every entry', () => {
    const off = appSupport({ ...LIVE, SUPPORT_IN_APP: '0' }, crowdfunding, label)
    expect(off?.inApp).toBe(false)
    // The link itself stays right, for the website and for old app builds that ignore the switch.
    expect(off?.crowdfundingUrl).toBe(LIVE.CROWDFUNDING_URL)
  })

  it('follows the switch of the app that asks', () => {
    const env = { ...LIVE, SUPPORT_IN_APP_IOS: '0' }
    expect(appSupport(env, crowdfunding, label, 'ios')?.inApp).toBe(false)
    expect(appSupport(env, crowdfunding, label, 'android')?.inApp).toBe(true)
    expect(appSupport({ ...LIVE, SUPPORT_IN_APP: 'nee', SUPPORT_IN_APP_IOS: 'ja' }, crowdfunding, label, 'ios')?.inApp).toBe(true)
  })

  it('is left out while there is no campaign with a named recipient', () => {
    expect(appSupport({}, crowdfunding, label)).toBeNull()
    expect(appSupport({ CROWDFUNDING_URL: LIVE.CROWDFUNDING_URL }, crowdfunding, label)).toBeNull()
    expect(appSupport({ OPERATOR_NAME: 'Laurens Bos' }, crowdfunding, label)).toBeNull()
    // Monthly support (Patreon) is not a campaign, and an unknown platform never shows.
    expect(appSupport({ SUPPORT_URL: 'https://www.patreon.com/rondje', OPERATOR_NAME: 'Laurens Bos' }, crowdfunding, label)).toBeNull()
    expect(appSupport({ CROWDFUNDING_URL: 'https://example.com/give', OPERATOR_NAME: 'Laurens Bos' }, crowdfunding, label)).toBeNull()
  })

  it('leaves the numbers out until both the goal and the amount raised are filled in', () => {
    const s = appSupport(LIVE, { goal: 3000, raised: null }, label)
    expect(s).toMatchObject({ goal: null, raised: null, rounds: null })
    expect(appSupport(LIVE, { goal: 3000, raised: 3 }, label)?.rounds).toEqual({ goal: 600, raised: 0 })
  })

  it('reads the real content file: a goal of €3,000 is 600 rounds', () => {
    const s = appSupport(LIVE, crowdfunding, label)
    expect(s?.goal).toBe(crowdfunding.goal)
    expect(s?.rounds?.goal).toBe(crowdfunding.goal / 5)
  })
})
